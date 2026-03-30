import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, rmdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  DEFAULT_ANTHROPIC_MODEL,
  POLICY_CONFIG_FILENAME,
  PluginPolicyConfigSchema,
  loadPluginPolicyConfig,
  detectModelFamily,
  resolvePluginPolicy,
  type PluginPolicyConfig
} from "../../src/config/policy.js";

describe("Plugin policy boundary", () => {
  it("accepts valid policy-only fields", () => {
    const result = PluginPolicyConfigSchema.safeParse({
      version: "1.0",
      global: {
        defaultModel: "anthropic/claude-3-5-sonnet-20241022",
        defaultFamily: "claude",
        fallbackChain: ["anthropic/claude-3-5-haiku-20241022"]
      },
      categories: {
        planning: {
          defaultModel: "anthropic/claude-3-5-sonnet-20241022",
          defaultFamily: "claude"
        }
      },
      agents: {
        editor: {
          modelOverride: {
            modelId: "openai/gpt-4o-mini",
            reason: "editing override"
          },
          preferredFamily: "gpt"
        }
      },
      families: {
        claude: { promptVariant: "default" },
        gpt: { promptVariant: "concise" }
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects provider runtime fields at the root level", () => {
    const result = PluginPolicyConfigSchema.safeParse({
      version: "1.0",
      providers: {
        anthropic: {}
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects provider runtime fields inside nested policy objects", () => {
    const result = PluginPolicyConfigSchema.safeParse({
      version: "1.0",
      global: {
        defaultModel: "anthropic/claude-3-5-sonnet-20241022",
        apiKey: "secret"
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects baseURL, timeout, and headers inside agent policy", () => {
    const result = PluginPolicyConfigSchema.safeParse({
      version: "1.0",
      agents: {
        critic: {
          modelOverride: { modelId: "anthropic/claude-3-5-sonnet-20241022" },
          baseURL: "https://example.com",
          timeout: 5000,
          headers: { authorization: "bad" }
        }
      }
    });

    expect(result.success).toBe(false);
  });

  it("accepts provider-qualified model identifiers and rejects invalid ones", () => {
    expect(
      PluginPolicyConfigSchema.safeParse({
        version: "1.0",
        global: { defaultModel: "openai/gpt-4o-mini" }
      }).success
    ).toBe(true);

    expect(
      PluginPolicyConfigSchema.safeParse({
        version: "1.0",
        global: { defaultModel: "gpt-4o-mini" }
      }).success
    ).toBe(false);
  });

  it("documents the config surface as repo-root oh-my-novelist.jsonc", () => {
    expect(POLICY_CONFIG_FILENAME).toBe("oh-my-novelist.jsonc");
  });

  describe("policy precedence", () => {
    const policyConfig: PluginPolicyConfig = {
      version: "1.0",
      global: {
        defaultModel: "anthropic/claude-3-5-haiku-20241022",
        defaultFamily: "claude"
      },
      categories: {
        planning: {
          defaultModel: "anthropic/claude-3-5-sonnet-20241022",
          defaultFamily: "claude"
        }
      },
      agents: {
        concept: {
          modelOverride: {
            modelId: "openai/gpt-4o-mini"
          },
          preferredFamily: "gpt"
        }
      }
    };

    it("prefers explicit override over agent, category, and global policy", () => {
      const result = resolvePluginPolicy(
        "concept",
        "planning",
        policyConfig,
        "anthropic/claude-3-haiku-20240229"
      );

      expect(result).toEqual({
        modelId: "anthropic/claude-3-haiku-20240229",
        family: "claude",
        source: "explicit"
      });
    });

    it("uses agent override when no explicit override is present", () => {
      const result = resolvePluginPolicy("concept", "planning", policyConfig);

      expect(result).toEqual({
        modelId: "openai/gpt-4o-mini",
        family: "gpt",
        source: "agent"
      });
    });

    it("uses category policy when agent policy is absent", () => {
      const result = resolvePluginPolicy("director", "planning", policyConfig);

      expect(result).toEqual({
        modelId: "anthropic/claude-3-5-sonnet-20241022",
        family: "claude",
        source: "category"
      });
    });

    it("uses global policy when category policy is absent", () => {
      const result = resolvePluginPolicy("editor", "editing", policyConfig);

      expect(result).toEqual({
        modelId: "anthropic/claude-3-5-haiku-20241022",
        family: "claude",
        source: "global"
      });
    });

    it("falls back to the Anthropic compatibility default when config is missing", () => {
      const result = resolvePluginPolicy("editor", "editing", null);

      expect(result).toEqual({
        modelId: DEFAULT_ANTHROPIC_MODEL,
        family: "claude",
        source: "default"
      });
    });
  });

  it("detects model family from provider-qualified model ids", () => {
    expect(detectModelFamily("anthropic/claude-3-5-sonnet-20241022")).toBe("claude");
    expect(detectModelFamily("openai/gpt-4o-mini")).toBe("gpt");
  });

  describe("loadPluginPolicyConfig() boundary regression", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "policy-test-"));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it("loads oh-my-novelist.jsonc correctly with jsonc comments", () => {
      const jsoncContent = `{
        "version": "1.0",
        "global": {
          "defaultModel": "anthropic/claude-3-5-sonnet-20241022",
          "defaultFamily": "claude"
        },
        "agents": {
          "editor": {
            "preferredFamily": "gpt"
          }
        }
      }`;

      writeFileSync(join(tempDir, POLICY_CONFIG_FILENAME), jsoncContent);

      const result = loadPluginPolicyConfig(tempDir);

      expect(result.config).not.toBeNull();
      expect(result.path).toBe(join(tempDir, POLICY_CONFIG_FILENAME));
      expect(result.config?.version).toBe("1.0");
      expect(result.config?.global?.defaultModel).toBe("anthropic/claude-3-5-sonnet-20241022");
      expect(result.config?.global?.defaultFamily).toBe("claude");
      expect(result.config?.agents?.editor?.preferredFamily).toBe("gpt");
    });

    it("handles missing file gracefully (returns null config)", () => {
      const result = loadPluginPolicyConfig(tempDir);

      expect(result.config).toBeNull();
      expect(result.path).toBe(join(tempDir, POLICY_CONFIG_FILENAME));
    });

    it("rejects invalid schema (wrong version)", () => {
      const invalidContent = `{
        "version": "2.0",
        "global": {
          "defaultModel": "anthropic/claude-3-5-sonnet-20241022"
        }
      }`;

      writeFileSync(join(tempDir, POLICY_CONFIG_FILENAME), invalidContent);

      expect(() => loadPluginPolicyConfig(tempDir)).toThrow();
    });

    it("rejects invalid schema (invalid model id format)", () => {
      const invalidContent = `{
        "version": "1.0",
        "global": {
          "defaultModel": "claude-3-5-sonnet-20241022"
        }
      }`;

      writeFileSync(join(tempDir, POLICY_CONFIG_FILENAME), invalidContent);

      expect(() => loadPluginPolicyConfig(tempDir)).toThrow();
    });

    it("rejects invalid schema (provider runtime fields)", () => {
      const invalidContent = `{
        "version": "1.0",
        "global": {
          "defaultModel": "anthropic/claude-3-5-sonnet-20241022"
        },
        "providers": {
          "anthropic": {
            "apiKey": "secret"
          }
        }
      }`;

      writeFileSync(join(tempDir, POLICY_CONFIG_FILENAME), invalidContent);

      expect(() => loadPluginPolicyConfig(tempDir)).toThrow();
    });

    it("enforces the official policy filename boundary (only oh-my-novelist.jsonc is recognized)", () => {
      writeFileSync(join(tempDir, "policy.json"), '{"version": "1.0"}');

      const result = loadPluginPolicyConfig(tempDir);

      expect(result.config).toBeNull();
      expect(result.path).toBe(join(tempDir, POLICY_CONFIG_FILENAME));
    });
  });
});
