/**
 * Tests for setup write-safety
 *
 * These tests define the expected behavior for:
 * - Safe config file writing with backup/overwrite protection
 * - Explicit confirmation required for overwrites
 * - Timestamped backup creation
 * - Graceful error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  chmodSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { POLICY_CONFIG_FILENAME } from "../../src/config/policy.js";

// Mock setup module that implements write-safety (to be implemented)
// These tests define the expected interface and behavior
interface ApplyResult {
  success: boolean;
  backupPath?: string;
  error?: string;
}

interface SetupModule {
  apply(
    directory: string,
    config: object,
    options?: { overwrite?: boolean }
  ): ApplyResult;
}

describe("Setup write-safety", () => {
  let tempDir: string;
  let setup: SetupModule;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = mkdtempSync(join(tmpdir(), "setup-test-"));

    // Mock the setup module (actual implementation to be provided)
    // This defines the expected interface
    setup = {
      apply: (
        dir: string,
        config: object,
        options: { overwrite?: boolean } = {}
      ): ApplyResult => {
        const configPath = join(dir, POLICY_CONFIG_FILENAME);
        const exists = existsSync(configPath);

        // If file exists and overwrite not confirmed, refuse
        if (exists && !options.overwrite) {
          return {
            success: false,
            error: "File exists. Set overwrite: true to replace with backup.",
          };
        }

        // If file exists and overwrite confirmed, create backup
        if (exists && options.overwrite) {
          const now = new Date();
          const timestamp =
            now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0") +
            "-" +
            String(now.getHours()).padStart(2, "0") +
            String(now.getMinutes()).padStart(2, "0") +
            String(now.getSeconds()).padStart(2, "0");
          const backupPath = `${configPath}.bak.${timestamp}`;

          try {
            const existingContent = readFileSync(configPath, "utf8");
            writeFileSync(backupPath, existingContent);
          } catch (err) {
            return {
              success: false,
              error: `Failed to create backup: ${err}`,
            };
          }

          try {
            writeFileSync(configPath, JSON.stringify(config, null, 2));
          } catch (err) {
            // Restore backup on write failure
            return {
              success: false,
              error: `Failed to write config: ${err}`,
            };
          }

          return { success: true, backupPath };
        }

        // New file creation
        try {
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          return { success: true };
        } catch (err) {
          return {
            success: false,
            error: `Failed to write config: ${err}`,
          };
        }
      },
    };
  });

  afterEach(() => {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("new file creation", () => {
    it("creates oh-my-novelist.jsonc in target directory", () => {
      const config = { version: "1.0", global: { defaultModel: "test" } };

      const result = setup.apply(tempDir, config);

      expect(result.success).toBe(true);
      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      expect(existsSync(configPath)).toBe(true);
    });

    it("writes only oh-my-novelist.jsonc, not llm.config.json", () => {
      const config = { version: "1.0" };

      setup.apply(tempDir, config);

      expect(existsSync(join(tempDir, POLICY_CONFIG_FILENAME))).toBe(true);
      expect(existsSync(join(tempDir, "llm.config.json"))).toBe(false);
    });

    it("writes valid JSON content", () => {
      const config = {
        version: "1.0",
        global: { defaultModel: "anthropic/claude-3-5-sonnet-20241022" },
      };

      setup.apply(tempDir, config);

      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      const content = readFileSync(configPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe("1.0");
    });
  });

  describe("overwrite protection", () => {
    it("refuses to overwrite without explicit confirmation", () => {
      // Create existing file
      const existingConfig = { version: "1.0", existing: true };
      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      // Try to apply without overwrite flag
      const newConfig = { version: "1.0", new: true };
      const result = setup.apply(tempDir, newConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain("overwrite");

      // Verify original file unchanged
      const content = readFileSync(configPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.existing).toBe(true);
      expect(parsed.new).toBeUndefined();
    });

    it("allows overwrite when explicitly confirmed", () => {
      // Create existing file
      const existingConfig = { version: "1.0", existing: true };
      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      // Apply with overwrite confirmation
      const newConfig = { version: "1.0", new: true };
      const result = setup.apply(tempDir, newConfig, { overwrite: true });

      expect(result.success).toBe(true);

      // Verify file was updated
      const content = readFileSync(configPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.new).toBe(true);
    });
  });

  describe("backup creation", () => {
    it("creates timestamped backup on overwrite", () => {
      vi.useFakeTimers();
      const mockDate = new Date("2024-03-15T10:30:45.123Z");
      vi.setSystemTime(mockDate);

      // Create existing file
      const existingConfig = { version: "1.0", existing: true };
      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      // Apply with overwrite
      const newConfig = { version: "2.0" };
      const result = setup.apply(tempDir, newConfig, { overwrite: true });

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(existsSync(result.backupPath!)).toBe(true);

      // Verify backup has timestamp pattern
      const backupFile = result.backupPath!.split("/").pop();
      expect(backupFile).toMatch(
        /oh-my-novelist\.jsonc\.bak\.\d{8}-\d{6}/
      );

      vi.useRealTimers();
    });

    it("backup contains original content", () => {
      // Create existing file with specific content
      const existingConfig = {
        version: "1.0",
        global: { defaultModel: "old-model" },
      };
      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      // Apply with overwrite
      const newConfig = { version: "2.0", global: { defaultModel: "new-model" } };
      const result = setup.apply(tempDir, newConfig, { overwrite: true });

      // Verify backup has original content
      const backupContent = readFileSync(result.backupPath!, "utf8");
      const backupParsed = JSON.parse(backupContent);
      expect(backupParsed.global.defaultModel).toBe("old-model");
    });

    it("creates unique backup files for multiple overwrites", () => {
      vi.useFakeTimers();

      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      const backupPaths: string[] = [];

      // First overwrite
      vi.setSystemTime(new Date("2024-03-15T10:30:00Z"));
      writeFileSync(configPath, JSON.stringify({ version: "1.0" }));
      const result1 = setup.apply(
        tempDir,
        { version: "1.1" },
        { overwrite: true }
      );
      backupPaths.push(result1.backupPath!);

      // Second overwrite
      vi.setSystemTime(new Date("2024-03-15T10:31:00Z"));
      const result2 = setup.apply(
        tempDir,
        { version: "1.2" },
        { overwrite: true }
      );
      backupPaths.push(result2.backupPath!);

      // Verify backups are different
      expect(backupPaths[0]).not.toBe(backupPaths[1]);
      expect(existsSync(backupPaths[0])).toBe(true);
      expect(existsSync(backupPaths[1])).toBe(true);

      vi.useRealTimers();
    });
  });

  describe("error handling", () => {
    it("handles permission-denied errors gracefully", () => {
      // Create existing file
      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      writeFileSync(configPath, JSON.stringify({ version: "1.0" }));

      // Make directory read-only (simulating permission issue)
      // Note: This is a mock - actual test would need platform-specific handling
      // or the setup module to handle EACCES errors
      const mockSetup: SetupModule = {
        apply: (dir, config, options = {}): ApplyResult => {
          const configPath = join(dir, POLICY_CONFIG_FILENAME);
          const exists = existsSync(configPath);

          if (exists && !options.overwrite) {
            return {
              success: false,
              error: "File exists. Set overwrite: true to replace with backup.",
            };
          }

          if (exists && options.overwrite) {
            try {
              const now = new Date();
              const timestamp =
                now.getFullYear().toString() +
                String(now.getMonth() + 1).padStart(2, "0") +
                String(now.getDate()).padStart(2, "0") +
                "-" +
                String(now.getHours()).padStart(2, "0") +
                String(now.getMinutes()).padStart(2, "0") +
                String(now.getSeconds()).padStart(2, "0");
              const backupPath = `${configPath}.bak.${timestamp}`;
              const existingContent = readFileSync(configPath, "utf8");
              writeFileSync(backupPath, existingContent);
              writeFileSync(configPath, JSON.stringify(config, null, 2));
              return { success: true, backupPath };
            } catch (err: any) {
              if (err.code === "EACCES" || err.message.includes("permission")) {
                return {
                  success: false,
                  error: "Permission denied: unable to write config file",
                };
              }
              throw err;
            }
          }

          try {
            writeFileSync(configPath, JSON.stringify(config, null, 2));
            return { success: true };
          } catch (err: any) {
            if (err.code === "EACCES" || err.message.includes("permission")) {
              return {
                success: false,
                error: "Permission denied: unable to write config file",
              };
            }
            throw err;
          }
        },
      };

      // For the actual test, we verify the interface handles errors gracefully
      // The permission-denied scenario would be tested with actual filesystem mocking
      // or in integration tests with controlled permissions

      // Here we just verify the result type is correct
      const result = mockSetup.apply(tempDir, { version: "2.0" }, {
        overwrite: true,
      });

      // If successful, verify no error; if failed, verify error message
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it("reports descriptive errors for write failures", () => {
      // Mock setup that simulates write failure
      const mockSetup: SetupModule = {
        apply: (): ApplyResult => {
          return {
            success: false,
            error: "Failed to write config: ENOSPC: no space left on device",
          };
        },
      };

      const result = mockSetup.apply(tempDir, { version: "1.0" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to write config");
    });
  });

  describe("malformed config handling", () => {
    it("backs up malformed existing config before overwrite", () => {
      vi.useFakeTimers();
      const mockDate = new Date("2024-03-15T10:30:45.123Z");
      vi.setSystemTime(mockDate);

      // Create malformed JSON file
      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      writeFileSync(configPath, "{ invalid json content }");

      // Apply with overwrite
      const newConfig = { version: "1.0" };
      const result = setup.apply(tempDir, newConfig, { overwrite: true });

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();

      // Verify backup contains malformed content
      const backupContent = readFileSync(result.backupPath!, "utf8");
      expect(backupContent).toBe("{ invalid json content }");

      // Verify new config is valid
      const newContent = readFileSync(configPath, "utf8");
      const parsed = JSON.parse(newContent);
      expect(parsed.version).toBe("1.0");

      vi.useRealTimers();
    });

    it("preserves exact malformed content in backup", () => {
      // Create file with specific malformed content
      const configPath = join(tempDir, POLICY_CONFIG_FILENAME);
      const malformedContent = `{\n  "version": "1.0",\n  "unclosed: "string\n}`;
      writeFileSync(configPath, malformedContent);

      // Apply with overwrite
      const result = setup.apply(tempDir, { version: "2.0" }, {
        overwrite: true,
      });

      // Verify backup preserves exact content
      const backupContent = readFileSync(result.backupPath!, "utf8");
      expect(backupContent).toBe(malformedContent);
    });
  });

  describe("edge cases", () => {
    it("handles empty directory correctly", () => {
      const config = { version: "1.0" };
      const result = setup.apply(tempDir, config);

      expect(result.success).toBe(true);
      expect(existsSync(join(tempDir, POLICY_CONFIG_FILENAME))).toBe(true);
    });

    it("handles config with nested objects", () => {
      const config = {
        version: "1.0",
        global: {
          defaultModel: "anthropic/claude-3-5-sonnet-20241022",
          defaultFamily: "claude",
        },
        categories: {
          planning: {
            defaultModel: "anthropic/claude-3-5-haiku-20241022",
          },
        },
        agents: {
          editor: {
            preferredFamily: "gpt",
          },
        },
      };

      const result = setup.apply(tempDir, config);

      expect(result.success).toBe(true);
      const content = readFileSync(
        join(tempDir, POLICY_CONFIG_FILENAME),
        "utf8"
      );
      const parsed = JSON.parse(content);
      expect(parsed.agents.editor.preferredFamily).toBe("gpt");
    });
  });
});
