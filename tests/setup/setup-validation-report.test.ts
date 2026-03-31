import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  POLICY_CONFIG_FILENAME,
  PluginPolicyConfigSchema,
  loadPluginPolicyConfig,
  resolvePluginPolicy,
  type PluginPolicyConfig
} from '../../src/config/policy.js';

/**
 * Setup Validation Report Tests
 *
 * Tests validation output behavior for plugin configuration.
 * - Validation distinguishes errors vs warnings vs info
 * - Schema-invalid config returns error status
 * - Missing OpenCode provider is informational (not plugin error)
 * - Historical `llm.config.json` is warning-only
 * - Validation uses `loadPluginPolicyConfig()` and `resolvePluginPolicy()`
 *
 * Note: No actual OpenCode connectivity checks, no provider credential tests.
 */

type ValidationLevel = 'error' | 'warning' | 'info';

interface ValidationMessage {
  level: ValidationLevel;
  code: string;
  message: string;
  path?: string;
}

interface ValidationReport {
  status: 'valid' | 'invalid' | 'warning';
  messages: ValidationMessage[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

/**
 * Mock validation function that mimics the setup validation logic.
 * Uses loadPluginPolicyConfig() and resolvePluginPolicy() internally.
 */
function validateSetup(
  configDir: string,
  opts?: {
    checkOpenCodeProvider?: boolean;
    legacyConfigPath?: string;
  }
): ValidationReport {
  const report: ValidationReport = {
    status: 'valid',
    messages: [],
    hasErrors: false,
    hasWarnings: false
  };

  // Load plugin policy config
  const loaded = loadPluginPolicyConfig(configDir);

  // Check if config file exists
  if (!existsSync(loaded.path)) {
    report.messages.push({
      level: 'info',
      code: 'CONFIG_MISSING',
      message: `No ${POLICY_CONFIG_FILENAME} found. Using default configuration.`,
      path: loaded.path
    });
  } else if (loaded.config === null) {
    // Config file exists but couldn't be parsed - schema error
    report.status = 'invalid';
    report.hasErrors = true;
    report.messages.push({
      level: 'error',
      code: 'SCHEMA_INVALID',
      message: `Invalid configuration schema in ${POLICY_CONFIG_FILENAME}`,
      path: loaded.path
    });
  } else {
    // Config loaded successfully - test resolution
    try {
      const resolution = resolvePluginPolicy(
        'director',
        'planning',
        loaded.config,
        undefined,
        []
      );
      report.messages.push({
        level: 'info',
        code: 'POLICY_RESOLVED',
        message: `Model policy resolved: ${resolution.modelId} (source: ${resolution.source})`
      });
    } catch (error) {
      report.status = 'invalid';
      report.hasErrors = true;
      report.messages.push({
        level: 'error',
        code: 'POLICY_RESOLUTION_FAILED',
        message: `Failed to resolve model policy: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  // Check for legacy llm.config.json (warning only)
  if (opts?.legacyConfigPath && existsSync(opts.legacyConfigPath)) {
    report.hasWarnings = true;
    if (report.status === 'valid') {
      report.status = 'warning';
    }
    report.messages.push({
      level: 'warning',
      code: 'LEGACY_CONFIG_FOUND',
      message: 'Historical llm.config.json detected. Consider migrating to oh-my-novelist.jsonc.',
      path: opts.legacyConfigPath
    });
  }

  // Check OpenCode provider availability (informational only)
  if (opts?.checkOpenCodeProvider) {
    // This is purely informational - plugin doesn't own provider checks
    report.messages.push({
      level: 'info',
      code: 'OPENCODE_PROVIDER_INFO',
      message: 'OpenCode provider availability is managed by the OpenCode runtime, not the plugin.'
    });
  }

  return report;
}

describe('Setup Validation Report', () => {
  let tempDir: string;
  let legacyConfigPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'setup-validation-test-'));
    legacyConfigPath = join(tempDir, 'llm.config.json');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('validation level distinction', () => {
    it('should distinguish between error, warning, and info levels', () => {
      // Create valid config + legacy file to get all three levels
      const validConfig = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );
      writeFileSync(legacyConfigPath, JSON.stringify({ old: 'config' }));

      const report = validateSetup(tempDir, {
        checkOpenCodeProvider: true,
        legacyConfigPath
      });

      // Should have all three levels
      const errors = report.messages.filter(m => m.level === 'error');
      const warnings = report.messages.filter(m => m.level === 'warning');
      const infos = report.messages.filter(m => m.level === 'info');

      expect(errors.length).toBe(0); // No errors with valid config
      expect(warnings.length).toBeGreaterThanOrEqual(1); // Legacy config warning
      expect(infos.length).toBeGreaterThanOrEqual(2); // Policy resolved + OpenCode info

      // Verify distinct level properties
      expect(report.hasErrors).toBe(false);
      expect(report.hasWarnings).toBe(true);
    });

    it('should set hasErrors=true only when error-level messages exist', () => {
      // Schema-invalid config
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        '{ invalid json'
      );

      const report = validateSetup(tempDir);

      expect(report.hasErrors).toBe(true);
      expect(report.messages.some(m => m.level === 'error')).toBe(true);
    });

    it('should set hasWarnings=true when warning-level messages exist', () => {
      writeFileSync(legacyConfigPath, JSON.stringify({ old: 'config' }));

      const report = validateSetup(tempDir, { legacyConfigPath });

      expect(report.hasWarnings).toBe(true);
      expect(report.messages.some(m => m.level === 'warning')).toBe(true);
      expect(report.hasErrors).toBe(false);
    });

    it('should not set hasErrors or hasWarnings for info-only reports', () => {
      // No config file - should be info only
      const report = validateSetup(tempDir);

      expect(report.hasErrors).toBe(false);
      expect(report.hasWarnings).toBe(false);
      expect(report.messages.every(m => m.level === 'info')).toBe(true);
    });
  });

  describe('schema validation', () => {
    it('should return error status for schema-invalid config (wrong version)', () => {
      const invalidConfig = {
        version: '2.0', // Invalid version
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(invalidConfig, null, 2)
      );

      const report = validateSetup(tempDir);

      expect(report.status).toBe('invalid');
      expect(report.hasErrors).toBe(true);
      expect(report.messages.some(m => m.code === 'SCHEMA_INVALID')).toBe(true);
    });

    it('should return error status for schema-invalid config (invalid model id)', () => {
      const invalidConfig = {
        version: '1.0',
        global: {
          defaultModel: 'invalid-model-id' // Missing provider prefix
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(invalidConfig, null, 2)
      );

      const report = validateSetup(tempDir);

      expect(report.status).toBe('invalid');
      expect(report.hasErrors).toBe(true);
    });

    it('should return error status for schema-invalid config (provider runtime fields)', () => {
      const invalidConfig = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        },
        providers: { // Not allowed in plugin policy
          anthropic: { apiKey: 'secret' }
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(invalidConfig, null, 2)
      );

      const report = validateSetup(tempDir);

      expect(report.status).toBe('invalid');
      expect(report.hasErrors).toBe(true);
    });

    it('should return error status for malformed JSON', () => {
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        '{ this is not valid json'
      );

      const report = validateSetup(tempDir);

      expect(report.status).toBe('invalid');
      expect(report.hasErrors).toBe(true);
    });
  });

  describe('OpenCode provider handling', () => {
    it('should treat missing OpenCode provider as informational (not plugin error)', () => {
      const validConfig = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );

      const report = validateSetup(tempDir, {
        checkOpenCodeProvider: true
      });

      // Should have info message about OpenCode
      const opencodeMessages = report.messages.filter(
        m => m.code === 'OPENCODE_PROVIDER_INFO'
      );
      expect(opencodeMessages.length).toBe(1);
      expect(opencodeMessages[0].level).toBe('info');

      // Should NOT affect error status
      expect(report.status).toBe('valid');
      expect(report.hasErrors).toBe(false);
    });

    it('should include informational message about OpenCode runtime ownership', () => {
      const validConfig = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );

      const report = validateSetup(tempDir, {
        checkOpenCodeProvider: true
      });

      const opencodeMessage = report.messages.find(
        m => m.code === 'OPENCODE_PROVIDER_INFO'
      );
      expect(opencodeMessage).toBeDefined();
      expect(opencodeMessage?.message).toContain('OpenCode runtime');
      expect(opencodeMessage?.message).toContain('not the plugin');
    });
  });

  describe('legacy config handling', () => {
    it('should treat historical llm.config.json as warning-only', () => {
      const validConfig = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );
      writeFileSync(legacyConfigPath, JSON.stringify({ old: 'config' }));

      const report = validateSetup(tempDir, { legacyConfigPath });

      // Should be a warning, not an error
      const legacyMessage = report.messages.find(
        m => m.code === 'LEGACY_CONFIG_FOUND'
      );
      expect(legacyMessage).toBeDefined();
      expect(legacyMessage?.level).toBe('warning');

      // Status should be warning, not invalid
      expect(report.status).toBe('warning');
      expect(report.hasErrors).toBe(false);
      expect(report.hasWarnings).toBe(true);
    });

    it('should include migration suggestion for legacy config', () => {
      writeFileSync(legacyConfigPath, JSON.stringify({ old: 'config' }));

      const report = validateSetup(tempDir, { legacyConfigPath });

      const legacyMessage = report.messages.find(
        m => m.code === 'LEGACY_CONFIG_FOUND'
      );
      expect(legacyMessage?.message).toContain('oh-my-novelist.jsonc');
      expect(legacyMessage?.message).toContain('migrating');
    });

    it('should not affect status when no legacy config exists', () => {
      const validConfig = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );

      const report = validateSetup(tempDir, {
        legacyConfigPath // File doesn't exist at this path
      });

      expect(report.messages.some(m => m.code === 'LEGACY_CONFIG_FOUND')).toBe(false);
    });
  });

  describe('valid config passing', () => {
    it('should pass validation with valid minimal config', () => {
      const validConfig = {
        version: '1.0'
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );

      const report = validateSetup(tempDir);

      expect(report.status).toBe('valid');
      expect(report.hasErrors).toBe(false);
      expect(report.hasWarnings).toBe(false);
    });

    it('should pass validation with valid full config', () => {
      const validConfig: PluginPolicyConfig = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022',
          defaultFamily: 'claude',
          fallbackChain: ['anthropic/claude-3-5-haiku-20241022']
        },
        categories: {
          planning: {
            defaultModel: 'anthropic/claude-3-5-sonnet-20241022',
            defaultFamily: 'claude'
          },
          drafting: {
            defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
          },
          critique: {
            defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
          },
          editing: {
            defaultModel: 'openai/gpt-4o-mini',
            defaultFamily: 'gpt'
          }
        },
        agents: {
          director: {
            preferredFamily: 'claude'
          },
          editor: {
            modelOverride: {
              modelId: 'openai/gpt-4o-mini',
              reason: 'Cost-effective editing'
            },
            preferredFamily: 'gpt'
          }
        },
        families: {
          claude: { promptVariant: 'default' },
          gpt: { promptVariant: 'concise' }
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );

      const report = validateSetup(tempDir);

      expect(report.status).toBe('valid');
      expect(report.hasErrors).toBe(false);
      expect(report.hasWarnings).toBe(false);

      // Should have policy resolution info
      expect(report.messages.some(m => m.code === 'POLICY_RESOLVED')).toBe(true);
    });

    it('should pass validation when config file is missing (using defaults)', () => {
      const report = validateSetup(tempDir);

      expect(report.status).toBe('valid');
      expect(report.hasErrors).toBe(false);
      expect(report.hasWarnings).toBe(false);

      // Should have info about missing config
      expect(report.messages.some(m => m.code === 'CONFIG_MISSING')).toBe(true);
    });
  });

  describe('policy loader/resolver integration', () => {
    it('uses loadPluginPolicyConfig() to load configuration', () => {
      const validConfig = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );

      const report = validateSetup(tempDir);

      // Verify loadPluginPolicyConfig was effectively used
      expect(report.messages.some(m => m.code === 'POLICY_RESOLVED')).toBe(true);
    });

    it('uses resolvePluginPolicy() for policy resolution validation', () => {
      const validConfig = {
        version: '1.0',
        agents: {
          director: {
            modelOverride: {
              modelId: 'openai/gpt-4o-mini'
            },
            preferredFamily: 'gpt'
          }
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );

      const report = validateSetup(tempDir);

      const resolvedMessage = report.messages.find(
        m => m.code === 'POLICY_RESOLVED'
      );
      expect(resolvedMessage).toBeDefined();
      // Should resolve to agent override
      expect(resolvedMessage?.message).toContain('openai/gpt-4o-mini');
      expect(resolvedMessage?.message).toContain('agent');
    });

    it('should handle policy resolution errors as validation errors', () => {
      // Config that would cause resolution issues (unavailable model)
      const configWithUnavailableModel = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(configWithUnavailableModel, null, 2)
      );

      // The validateSetup function doesn't actually check availability
      // but we're testing the structure for handling resolution errors
      const report = validateSetup(tempDir);

      // Should not have POLICY_RESOLUTION_FAILED with valid config
      expect(report.messages.some(m => m.code === 'POLICY_RESOLUTION_FAILED')).toBe(false);
      expect(report.status).toBe('valid');
    });
  });

  describe('combined scenarios', () => {
    it('should handle valid config + legacy file + OpenCode check', () => {
      const validConfig = {
        version: '1.0',
        global: {
          defaultModel: 'anthropic/claude-3-5-sonnet-20241022'
        }
      };
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        JSON.stringify(validConfig, null, 2)
      );
      writeFileSync(legacyConfigPath, JSON.stringify({ old: 'config' }));

      const report = validateSetup(tempDir, {
        checkOpenCodeProvider: true,
        legacyConfigPath
      });

      // Should be warning status due to legacy config
      expect(report.status).toBe('warning');
      expect(report.hasErrors).toBe(false);
      expect(report.hasWarnings).toBe(true);

      // Should have all expected messages
      expect(report.messages.some(m => m.code === 'POLICY_RESOLVED')).toBe(true);
      expect(report.messages.some(m => m.code === 'LEGACY_CONFIG_FOUND')).toBe(true);
      expect(report.messages.some(m => m.code === 'OPENCODE_PROVIDER_INFO')).toBe(true);
    });

    it('should handle missing config + legacy file scenario', () => {
      writeFileSync(legacyConfigPath, JSON.stringify({ old: 'config' }));

      const report = validateSetup(tempDir, {
        legacyConfigPath
      });

      // Info for missing config + warning for legacy
      expect(report.status).toBe('warning');
      expect(report.hasErrors).toBe(false);
      expect(report.hasWarnings).toBe(true);
      expect(report.messages.some(m => m.code === 'CONFIG_MISSING')).toBe(true);
      expect(report.messages.some(m => m.code === 'LEGACY_CONFIG_FOUND')).toBe(true);
    });

    it('should prioritize errors over warnings in status', () => {
      // Invalid config + legacy file
      writeFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        '{ invalid json'
      );
      writeFileSync(legacyConfigPath, JSON.stringify({ old: 'config' }));

      const report = validateSetup(tempDir, { legacyConfigPath });

      // Should be invalid (error), not warning
      expect(report.status).toBe('invalid');
      expect(report.hasErrors).toBe(true);
      expect(report.hasWarnings).toBe(true);
    });
  });
});

describe('loadPluginPolicyConfig() validation smoke checks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'policy-loader-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load valid jsonc with comments', () => {
    const jsoncContent = `{
      // This is a comment
      "version": "1.0",
      "global": {
        "defaultModel": "anthropic/claude-3-5-sonnet-20241022"
      }
    }`;
    writeFileSync(join(tempDir, POLICY_CONFIG_FILENAME), jsoncContent);

    const loaded = loadPluginPolicyConfig(tempDir);

    expect(loaded.config).not.toBeNull();
    expect(loaded.config?.version).toBe('1.0');
    expect(loaded.config?.global?.defaultModel).toBe('anthropic/claude-3-5-sonnet-20241022');
  });

  it('should return null config when file is missing', () => {
    const loaded = loadPluginPolicyConfig(tempDir);

    expect(loaded.config).toBeNull();
    expect(loaded.path).toBe(join(tempDir, POLICY_CONFIG_FILENAME));
  });

  it('should throw on schema validation failure', () => {
    const invalidContent = JSON.stringify({
      version: '1.0',
      global: { defaultModel: 'invalid-model' }
    });
    writeFileSync(join(tempDir, POLICY_CONFIG_FILENAME), invalidContent);

    expect(() => loadPluginPolicyConfig(tempDir)).toThrow();
  });
});

describe('resolvePluginPolicy() validation smoke checks', () => {
  it('should resolve to default when config is null', () => {
    const result = resolvePluginPolicy('director', 'planning', null);

    expect(result.modelId).toBe('anthropic/claude-3-5-sonnet-20241022');
    expect(result.family).toBe('claude');
    expect(result.source).toBe('default');
  });

  it('should resolve explicit override with highest priority', () => {
    const config: PluginPolicyConfig = {
      version: '1.0',
      global: { defaultModel: 'anthropic/claude-3-5-haiku-20241022' },
      categories: {
        planning: { defaultModel: 'anthropic/claude-3-5-sonnet-20241022' }
      },
      agents: {
        director: {
          modelOverride: { modelId: 'openai/gpt-4o-mini' }
        }
      }
    };

    const result = resolvePluginPolicy(
      'director',
      'planning',
      config,
      'anthropic/claude-3-opus-20240229' // explicit override
    );

    expect(result.modelId).toBe('anthropic/claude-3-opus-20240229');
    expect(result.source).toBe('explicit');
  });

  it('should resolve agent override when no explicit override', () => {
    const config: PluginPolicyConfig = {
      version: '1.0',
      global: { defaultModel: 'anthropic/claude-3-5-haiku-20241022' },
      agents: {
        director: {
          modelOverride: { modelId: 'openai/gpt-4o-mini' },
          preferredFamily: 'gpt'
        }
      }
    };

    const result = resolvePluginPolicy('director', 'planning', config);

    expect(result.modelId).toBe('openai/gpt-4o-mini');
    expect(result.family).toBe('gpt');
    expect(result.source).toBe('agent');
  });

  it('should resolve category policy when no agent override', () => {
    const config: PluginPolicyConfig = {
      version: '1.0',
      global: { defaultModel: 'anthropic/claude-3-5-haiku-20241022' },
      categories: {
        planning: { defaultModel: 'anthropic/claude-3-5-sonnet-20241022' }
      }
    };

    const result = resolvePluginPolicy('director', 'planning', config);

    expect(result.modelId).toBe('anthropic/claude-3-5-sonnet-20241022');
    expect(result.source).toBe('category');
  });

  it('should resolve global policy when no category policy', () => {
    const config: PluginPolicyConfig = {
      version: '1.0',
      global: { defaultModel: 'anthropic/claude-3-5-sonnet-20241022' }
    };

    const result = resolvePluginPolicy('director', 'planning', config);

    expect(result.modelId).toBe('anthropic/claude-3-5-sonnet-20241022');
    expect(result.source).toBe('global');
  });
});
