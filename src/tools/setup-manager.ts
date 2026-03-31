import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  POLICY_CONFIG_FILENAME,
  PluginPolicyConfigSchema,
  loadPluginPolicyConfig,
  type PluginPolicyConfig,
  type LoadedPluginPolicyConfig,
} from "../config/policy.js";

// Result types
export interface InspectResult {
  success: boolean;
  status: "missing" | "valid" | "malformed";
  configExists: boolean;
  configPath: string;
  isValid?: boolean;
  errors?: string[];
  warnings?: string[];
  detectedLegacy?: string[];
  error?: string;
  errorCode?: string;
}

export interface PreviewResult {
  success: boolean;
  preview?: PluginPolicyConfig;
  hasChanges?: boolean;
  changes?: Array<{ type: string; path: string }>;
  error?: string;
  errorCode?: string;
}

export interface ApplyResult {
  success: boolean;
  configPath?: string;
  backupPath?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

// Sanitized config type (without credentials)
type SanitizedPluginPolicyConfig = Omit<
  PluginPolicyConfig,
  "apiKey" | "baseURL" | "endpoint" | "provider"
>;

/**
 * SetupManagerTool provides pure setup decision logic for oh-my-novelist.
 *
 * This class handles:
 * - Inspecting current config state (missing/valid/malformed)
 * - Previewing configuration changes without writing files
 * - Applying configuration with safety checks (backup, overwrite confirmation)
 *
 * All methods work without OpenCode runtime calls and never handle credentials.
 */
export class SetupManagerTool {
  private baseDir: string;
  private configPath: string;
  private legacyConfigPath: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.configPath = join(baseDir, POLICY_CONFIG_FILENAME);
    this.legacyConfigPath = join(baseDir, "llm.config.json");
  }

  /**
   * Inspects the current setup state.
   *
   * Detects:
   * - Whether oh-my-novelist.jsonc exists
   * - Whether the config is valid or malformed
   * - Whether legacy llm.config.json exists (warning only)
   *
   * Does NOT write any files.
   */
  async inspect(): Promise<InspectResult> {
    let loaded: LoadedPluginPolicyConfig;
    
    try {
      loaded = loadPluginPolicyConfig(this.baseDir);
    } catch (error) {
      const configPath = join(this.baseDir, POLICY_CONFIG_FILENAME);
      const exists = existsSync(configPath);
      const errorMessage = error instanceof Error 
        ? this.sanitizeErrorMessage(error.message)
        : "Configuration validation failed";
      const result: InspectResult = {
        success: true,
        status: exists ? "malformed" : "missing",
        configExists: exists,
        configPath,
        isValid: false,
        error: "",
        errors: [errorMessage],
        warnings: [],
        detectedLegacy: [],
      };
      
      if (existsSync(this.legacyConfigPath)) {
        result.detectedLegacy!.push("llm.config.json");
        result.warnings!.push(
          "Historical llm.config.json detected. This file is deprecated and should be migrated to oh-my-novelist.jsonc."
        );
      }
      
      return result;
    }
    
    const result: InspectResult = {
      success: true,
      status: "missing",
      configExists: false,
      configPath: loaded.path,
      error: "",
      errors: [],
      warnings: [],
      detectedLegacy: [],
    };

    if (existsSync(this.legacyConfigPath)) {
      result.detectedLegacy!.push("llm.config.json");
      result.warnings!.push(
        "Historical llm.config.json detected. This file is deprecated and should be migrated to oh-my-novelist.jsonc."
      );
    }

    if (!existsSync(loaded.path)) {
      result.status = "missing";
      return result;
    }

    result.configExists = true;
    result.status = "valid";
    result.isValid = true;

    return result;
  }

  /**
   * Previews what the configuration would look like.
   *
   * Generates the content that would be written to oh-my-novelist.jsonc
   * without actually writing it. Strips any credential fields.
   *
   * Does NOT write any files.
   */
  async preview(
    config?: Partial<PluginPolicyConfig>
  ): Promise<PreviewResult> {
    try {
      // Build the preview config (sanitize credentials)
      const previewConfig = this.buildSanitizedConfig(config);

      // Check for changes if existing config exists
      let hasChanges = true;
      const changes: Array<{ type: string; path: string }> = [];

      if (existsSync(this.configPath)) {
        try {
          const raw = readFileSync(this.configPath, "utf8");
          const existing = JSON.parse(this.stripJsonComments(raw));
          const sanitizedExisting = this.sanitizeConfig(existing);

          // Compare sanitized versions
          hasChanges =
            JSON.stringify(previewConfig) !== JSON.stringify(sanitizedExisting);

          if (hasChanges) {
            changes.push({
              type: "update",
              path: this.configPath,
            });
          }
        } catch {
          // If existing is malformed, we definitely have changes
          hasChanges = true;
          changes.push({
            type: "replace",
            path: this.configPath,
          });
        }
      } else {
        changes.push({
          type: "create",
          path: this.configPath,
        });
      }

      return {
        success: true,
        preview: previewConfig,
        hasChanges,
        changes,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate preview",
        errorCode: "PREVIEW_FAILED",
      };
    }
  }

  /**
   * Applies the configuration with safety checks.
   *
   * Preconditions:
   * - If file exists and overwrite is not confirmed, returns error
   * - If file exists and overwrite is confirmed, creates backup first
   * - Never includes credentials in the written config
   *
   * @param config - Partial configuration to apply
   * @param dryRun - If true, only simulates changes without writing
   * @param overwrite - Must be true to overwrite existing config
   */
  async apply(
    config?: Partial<PluginPolicyConfig>,
    dryRun = false,
    overwrite = false
  ): Promise<ApplyResult> {
    try {
      const sanitizedConfig = this.buildSanitizedConfig(config);
      const newContent = JSON.stringify(sanitizedConfig, null, 2);
      const fileExists = existsSync(this.configPath);

      if (fileExists && !overwrite) {
        try {
          const existingContent = readFileSync(this.configPath, "utf8");
          if (existingContent.trim() === newContent.trim()) {
            return {
              success: true,
              configPath: this.configPath,
              message: "Configuration is already up to date",
            };
          }
        } catch {
          // If we can't read the file, require overwrite
        }
        return {
          success: false,
          error: "File exists. Set overwrite: true to replace with backup.",
          errorCode: "OVERWRITE_REQUIRED",
        };
      }

      let backupPath: string | undefined;

      if (fileExists && overwrite) {
        const timestamp = this.generateTimestamp();
        backupPath = `${this.configPath}.bak.${timestamp}`;

        if (!dryRun) {
          try {
            const existingContent = readFileSync(this.configPath, "utf8");
            writeFileSync(backupPath, existingContent);
          } catch (error) {
            return {
              success: false,
              error: `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
              errorCode: "BACKUP_FAILED",
            };
          }
        }
      }

      if (!dryRun) {
        try {
          writeFileSync(this.configPath, newContent);
        } catch (error) {
          return {
            success: false,
            error: `Failed to write config: ${error instanceof Error ? error.message : String(error)}`,
            errorCode: "WRITE_FAILED",
          };
        }
      }

      const message = dryRun
        ? "Dry run completed"
        : fileExists
          ? "Configuration updated successfully"
          : "Configuration created successfully";

      return {
        success: true,
        configPath: this.configPath,
        backupPath,
        message,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        errorCode: "APPLY_FAILED",
      };
    }
  }

  /**
   * Synchronous version of execute for compatibility with test expectations.
   *
   * @deprecated Use async methods (inspect, preview, apply) instead.
   */
  execute(args: {
    action: string;
    config?: Partial<PluginPolicyConfig>;
    dryRun?: boolean;
    overwrite?: boolean;
  }): InspectResult | PreviewResult | ApplyResult {
    const validActions = ["inspect", "preview", "apply"];

    if (!args.action) {
      return {
        success: false,
        status: "missing" as const,
        configExists: false,
        configPath: this.configPath,
        error: "Action is required",
        errorCode: "MISSING_ACTION",
      } as InspectResult;
    }

    if (!validActions.includes(args.action)) {
      return {
        success: false,
        status: "missing" as const,
        configExists: false,
        configPath: this.configPath,
        error: `Invalid action: ${args.action}. Must be one of: ${validActions.join(", ")}`,
        errorCode: "UNSUPPORTED_ACTION",
      } as InspectResult;
    }

    // For tests that expect synchronous execution, we'll use a sync implementation
    switch (args.action) {
      case "inspect": {
        let loaded: LoadedPluginPolicyConfig;
        
        try {
          loaded = loadPluginPolicyConfig(this.baseDir);
        } catch (error) {
          const configPath = join(this.baseDir, POLICY_CONFIG_FILENAME);
          const exists = existsSync(configPath);
          const errorMessage = error instanceof Error 
            ? this.sanitizeErrorMessage(error.message)
            : "Configuration validation failed";
          const result: InspectResult = {
            success: true,
            status: exists ? "malformed" : "missing",
            configExists: exists,
            configPath,
            isValid: false,
            error: "",
            errors: [errorMessage],
            warnings: [],
            detectedLegacy: [],
          };
          
          if (existsSync(this.legacyConfigPath)) {
            result.detectedLegacy!.push("llm.config.json");
            result.warnings!.push(
              "Historical llm.config.json detected. This file is deprecated and should be migrated to oh-my-novelist.jsonc."
            );
          }
          
          return result;
        }
        
        const result: InspectResult = {
          success: true,
          status: "missing",
          configExists: false,
          configPath: loaded.path,
          error: "",
          errors: [],
          warnings: [],
          detectedLegacy: [],
        };

        if (existsSync(this.legacyConfigPath)) {
          result.detectedLegacy!.push("llm.config.json");
          result.warnings!.push(
            "Historical llm.config.json detected. This file is deprecated and should be migrated to oh-my-novelist.jsonc."
          );
        }

        if (!existsSync(loaded.path)) {
          result.status = "missing";
          return result;
        }

        result.configExists = true;
        result.status = "valid";
        result.isValid = true;

        return result;
      }

      case "preview": {
        try {
          const previewConfig = this.buildSanitizedConfig(args.config);
          let hasChanges = true;
          const changes: Array<{ type: string; path: string }> = [];

          if (existsSync(this.configPath)) {
            try {
              const raw = readFileSync(this.configPath, "utf8");
              const existing = JSON.parse(this.stripJsonComments(raw));
              const sanitizedExisting = this.sanitizeConfig(existing);
              hasChanges =
                JSON.stringify(previewConfig) !==
                JSON.stringify(sanitizedExisting);
              if (hasChanges) {
                changes.push({ type: "update", path: this.configPath });
              }
            } catch {
              hasChanges = true;
              changes.push({ type: "replace", path: this.configPath });
            }
          } else {
            changes.push({ type: "create", path: this.configPath });
          }

          return {
            success: true,
            error: "",
            preview: previewConfig,
            hasChanges,
            changes,
          };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to generate preview",
            errorCode: "PREVIEW_FAILED",
          };
        }
      }

      case "apply": {
        try {
          const sanitizedConfig = this.buildSanitizedConfig(args.config);
          const newContent = JSON.stringify(sanitizedConfig, null, 2);
          const fileExists = existsSync(this.configPath);

          if (fileExists && !args.overwrite) {
            try {
              const existingContent = readFileSync(this.configPath, "utf8");
              if (existingContent.trim() === newContent.trim()) {
                return {
                  success: true,
                  configPath: this.configPath,
                  message: "Configuration is already up to date",
                };
              }
            } catch {
              // If we can't read the file, require overwrite
            }
            return {
              success: false,
              error:
                "File exists. Set overwrite: true to replace with backup.",
              errorCode: "OVERWRITE_REQUIRED",
            };
          }

          let backupPath: string | undefined;

          if (fileExists && args.overwrite) {
            const timestamp = this.generateTimestamp();
            backupPath = `${this.configPath}.bak.${timestamp}`;

            if (!args.dryRun) {
              try {
                const existingContent = readFileSync(this.configPath, "utf8");
                writeFileSync(backupPath, existingContent);
              } catch (error) {
                return {
                  success: false,
                  error: `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
                  errorCode: "BACKUP_FAILED",
                };
              }
            }
          }

          if (!args.dryRun) {
            try {
              writeFileSync(this.configPath, newContent);
            } catch (error) {
              return {
                success: false,
                error: `Failed to write config: ${error instanceof Error ? error.message : String(error)}`,
                errorCode: "WRITE_FAILED",
              };
            }
          }

          const message = args.dryRun
            ? "Dry run completed"
            : fileExists
              ? "Configuration updated successfully"
              : "Configuration created successfully";

          return {
            success: true,
            error: "",
            configPath: this.configPath,
            backupPath,
            message,
          };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Unknown error occurred",
            errorCode: "APPLY_FAILED",
          };
        }
      }

      default:
        return {
          success: false,
          status: "missing" as const,
          configExists: false,
          configPath: this.configPath,
          error: `Invalid action: ${args.action}. Must be one of: inspect, preview, apply`,
          errorCode: "UNSUPPORTED_ACTION",
        } as InspectResult;
    }
  }

  /**
   * Builds a sanitized config without any credential fields.
   */
  private buildSanitizedConfig(
    config?: Partial<PluginPolicyConfig>
  ): PluginPolicyConfig {
    // Start with defaults
    const defaultConfig: PluginPolicyConfig = {
      version: "1.0",
      global: {
        defaultModel: "anthropic/claude-3-5-sonnet-20241022",
        defaultFamily: "claude",
      },
    };

    // Merge provided config, ensuring no credentials
    const merged: PluginPolicyConfig = {
      ...defaultConfig,
      ...config,
      global: {
        ...defaultConfig.global,
        ...config?.global,
      },
    };

    // Sanitize any credentials that might have been passed
    return this.sanitizeConfig(merged);
  }

  /**
   * Removes credential fields from a config object.
   */
  private sanitizeConfig(
    config: Record<string, unknown>
  ): PluginPolicyConfig {
    const credentialFields = ["apiKey", "baseURL", "endpoint", "provider"];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      if (!credentialFields.includes(key)) {
        sanitized[key] = value;
      }
    }

    return sanitized as PluginPolicyConfig;
  }

  /**
   * Sanitizes error messages to remove credential field names.
   */
  private sanitizeErrorMessage(message: string): string {
    const credentialPatterns = [
      { pattern: /"apiKey"/g, replacement: '"[REDACTED]"' },
      { pattern: /"baseURL"/g, replacement: '"[REDACTED]"' },
      { pattern: /"endpoint"/g, replacement: '"[REDACTED]"' },
      { pattern: /"provider"/g, replacement: '"[REDACTED]"' },
      { pattern: /apiKey/g, replacement: '[REDACTED]' },
      { pattern: /baseURL/g, replacement: '[REDACTED]' },
      { pattern: /endpoint/g, replacement: '[REDACTED]' },
      { pattern: /provider/g, replacement: '[REDACTED]' },
    ];

    let sanitized = message;
    for (const { pattern, replacement } of credentialPatterns) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  /**
   * Strips JSON comments from a string.
   */
  private stripJsonComments(value: string): string {
    return value
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
  }

  /**
   * Generates a timestamp string for backup files.
   * Format: YYYYMMDD-HHMMSS
   */
  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}-${hour}${minute}${second}`;
  }
}

// Re-export types from policy config
export type { PluginPolicyConfig, LoadedPluginPolicyConfig };
export { POLICY_CONFIG_FILENAME };
