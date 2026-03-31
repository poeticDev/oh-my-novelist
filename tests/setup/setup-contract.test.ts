/**
 * novelist_setup v1 Behavior Contract Tests
 *
 * These tests define the expected behavior of the novelist_setup tool
 * before the implementation exists. This is TDD - tests define the contract.
 *
 * Contract rules:
 * 1. novelist_setup supports exactly 3 actions: inspect, preview, apply
 * 2. The only writable target is oh-my-novelist.jsonc
 * 3. llm.config.json is warning-only historical context, never written
 * 4. preview/apply outputs exclude: apiKey, baseURL, endpoint, provider credentials
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { SetupManagerTool } from "../../src/tools/setup-manager.js";

describe("novelist_setup v1 Behavior Contract", () => {
  let tempDir: string;
  let setupManager: SetupManagerTool;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "setup-test-"));
    setupManager = new SetupManagerTool(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Action Support Contract", () => {
    it("supports exactly three actions: inspect, preview, apply", () => {
      const validActions = ["inspect", "preview", "apply"];

      for (const action of validActions) {
        const result = setupManager.execute({ action });
        expect(result.error).not.toMatch(/unsupported|invalid action/i);
      }
    });

    it("rejects unsupported actions with clear error", () => {
      const unsupportedActions = [
        "init",
        "create",
        "generate",
        "validate",
        "sync",
        "migrate",
        "update",
        "delete",
        "remove",
      ];

      for (const action of unsupportedActions) {
        const result = setupManager.execute({ action });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/unsupported action|invalid action/i);
      }
    });

    it("requires action parameter", () => {
      const result = setupManager.execute({} as { action: string });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/action is required|missing action/i);
    });
  });

  describe("Write Target Contract - oh-my-novelist.jsonc", () => {
    it("writes configuration only to oh-my-novelist.jsonc", () => {
      const result = setupManager.execute({ action: "apply" });
      
      const configPath = join(tempDir, "oh-my-novelist.jsonc");
      expect(existsSync(configPath)).toBe(true);
    });

    it("never creates llm.config.json during apply", () => {
      setupManager.execute({ action: "apply" });
      
      const legacyPath = join(tempDir, "llm.config.json");
      expect(existsSync(legacyPath)).toBe(false);
    });

    it("never creates any .env file during apply", () => {
      setupManager.execute({ action: "apply" });
      
      const envPath = join(tempDir, ".env");
      const envLocalPath = join(tempDir, ".env.local");
      expect(existsSync(envPath)).toBe(false);
      expect(existsSync(envLocalPath)).toBe(false);
    });

    it("oh-my-novelist.jsonc is the only writable config target", () => {
      const result = setupManager.execute({ action: "apply" });
      
      const files = require("fs").readdirSync(tempDir);
      const configFiles = files.filter(
        (f: string) => f.endsWith(".json") || f.endsWith(".jsonc")
      );
      
      expect(configFiles).toHaveLength(1);
      expect(configFiles[0]).toBe("oh-my-novelist.jsonc");
    });
  });

  describe("Historical Context Contract - llm.config.json", () => {
    it("detects existing llm.config.json during inspect", () => {
      const legacyConfig = {
        provider: "anthropic",
        model: "claude-3-sonnet",
        apiKey: "sk-ant-legacy123",
      };
      writeFileSync(
        join(tempDir, "llm.config.json"),
        JSON.stringify(legacyConfig, null, 2)
      );

      const result = setupManager.execute({ action: "inspect" });
      
      expect(result.detectedLegacy).toContain("llm.config.json");
    });

    it("marks llm.config.json as warning-only (never migrates)", () => {
      const legacyConfig = {
        provider: "anthropic",
        model: "claude-3-sonnet",
        apiKey: "sk-ant-legacy123",
      };
      writeFileSync(
        join(tempDir, "llm.config.json"),
        JSON.stringify(legacyConfig, null, 2)
      );

      setupManager.execute({ action: "inspect" });
      
      const legacyPath = join(tempDir, "llm.config.json");
      expect(existsSync(legacyPath)).toBe(true);
      
      const content = JSON.parse(readFileSync(legacyPath, "utf-8"));
      expect(content.apiKey).toBe("sk-ant-legacy123");
    });

    it("includes warning about llm.config.json being historical only", () => {
      writeFileSync(
        join(tempDir, "llm.config.json"),
        JSON.stringify({ provider: "anthropic" }, null, 2)
      );

      const result = setupManager.execute({ action: "inspect" });
      
      expect(result.warnings).toContainEqual(
        expect.stringMatching(/llm\.config\.json.*historical|legacy|deprecated/i)
      );
    });
  });

  describe("Credential Sanitization Contract", () => {
    const sensitiveFields = ["apiKey", "baseURL", "endpoint", "provider"];

    beforeEach(() => {
      const configWithSecrets = {
        version: "1.0",
        global: {
          defaultModel: "anthropic/claude-3-sonnet",
        },
        apiKey: "sk-ant-secret123",
        baseURL: "https://api.anthropic.com",
        endpoint: "/v1/messages",
        provider: "anthropic",
      };
      
      writeFileSync(
        join(tempDir, "oh-my-novelist.jsonc"),
        JSON.stringify(configWithSecrets, null, 2)
      );
    });

    it("preview output never includes apiKey", () => {
      const result = setupManager.execute({ action: "preview" });
      const output = JSON.stringify(result);
      
      expect(output).not.toContain("apiKey");
      expect(output).not.toContain("sk-ant");
      expect(output).not.toContain("secret");
    });

    it("preview output never includes baseURL", () => {
      const result = setupManager.execute({ action: "preview" });
      const output = JSON.stringify(result);
      
      expect(output).not.toContain("baseURL");
      expect(output).not.toContain("https://api.anthropic.com");
    });

    it("preview output never includes endpoint", () => {
      const result = setupManager.execute({ action: "preview" });
      const output = JSON.stringify(result);
      
      expect(output).not.toContain("endpoint");
      expect(output).not.toContain("/v1/messages");
    });

    it("preview output never includes provider", () => {
      const result = setupManager.execute({ action: "preview" });
      const output = JSON.stringify(result);
      
      expect(output).not.toContain('"provider"');
      expect(output).not.toContain('"anthropic"');
    });

    it("apply output never includes credentials", () => {
      const result = setupManager.execute({ action: "apply" });
      const output = JSON.stringify(result);
      
      for (const field of sensitiveFields) {
        expect(output).not.toContain(field);
      }
    });

    it("inspect output never includes credentials", () => {
      const result = setupManager.execute({ action: "inspect" });
      const output = JSON.stringify(result);
      
      for (const field of sensitiveFields) {
        expect(output).not.toContain(field);
      }
    });

    it("sanitizes provider-qualified model identifiers safely", () => {
      const result = setupManager.execute({ action: "preview" });
      
      const output = JSON.stringify(result);
      expect(output).not.toMatch(/"provider":\s*"anthropic"/);
    });
  });

  describe("Apply Action Contract", () => {
    it("creates oh-my-novelist.jsonc with valid schema", () => {
      const result = setupManager.execute({ action: "apply" });
      
      expect(result.success).toBe(true);
      
      const configPath = join(tempDir, "oh-my-novelist.jsonc");
      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      
      expect(config.version).toMatch(/^1\./);
      expect(config.global).toBeDefined();
      expect(config.global.defaultModel).toMatch(/\w+\/\w+/);
    });

    it("apply is idempotent - running twice produces same result", () => {
      const result1 = setupManager.execute({ action: "apply" });
      const configPath = join(tempDir, "oh-my-novelist.jsonc");
      const content1 = readFileSync(configPath, "utf-8");
      
      const result2 = setupManager.execute({ action: "apply" });
      const content2 = readFileSync(configPath, "utf-8");
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(content1).toBe(content2);
    });

    it("apply returns the path to created config file", () => {
      const result = setupManager.execute({ action: "apply" });
      
      expect(result.configPath).toBe(join(tempDir, "oh-my-novelist.jsonc"));
    });
  });

  describe("Preview Action Contract", () => {
    it("returns what would be written without creating files", () => {
      const result = setupManager.execute({ action: "preview" });
      
      const files = require("fs").readdirSync(tempDir);
      expect(files).toHaveLength(0);
      
      expect(result.preview).toBeDefined();
      expect(result.preview.version).toMatch(/^1\./);
    });

    it("preview includes diff of changes for existing config", () => {
      setupManager.execute({ action: "apply" });
      
      const result = setupManager.execute({ action: "preview" });
      
      expect(result.changes).toBeDefined();
      expect(result.hasChanges).toBe(false);
    });
  });

  describe("Inspect Action Contract", () => {
    it("returns current setup status without modifications", () => {
      const result = setupManager.execute({ action: "inspect" });
      
      const files = require("fs").readdirSync(tempDir);
      expect(files).toHaveLength(0);
      
      expect(result.status).toBeDefined();
      expect(result.configExists).toBe(false);
    });

    it("inspect reports when oh-my-novelist.jsonc exists", () => {
      setupManager.execute({ action: "apply" });
      
      const result = setupManager.execute({ action: "inspect" });
      
      expect(result.configExists).toBe(true);
      expect(result.configPath).toBe(join(tempDir, "oh-my-novelist.jsonc"));
    });

    it("inspect reports config validity", () => {
      setupManager.execute({ action: "apply" });
      
      const result = setupManager.execute({ action: "inspect" });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("inspect detects invalid config and reports errors", () => {
      writeFileSync(
        join(tempDir, "oh-my-novelist.jsonc"),
        JSON.stringify({ invalid: true, version: "2.0" }, null, 2)
      );
      
      const result = setupManager.execute({ action: "inspect" });
      
      expect(result.configExists).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling Contract", () => {
    it("returns structured error response on failure", () => {
      const result = setupManager.execute({ action: "invalid" });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    });

    it("includes error code for programmatic handling", () => {
      const result = setupManager.execute({ action: "invalid" });
      
      expect(result.errorCode).toBeDefined();
      expect(result.errorCode).toMatch(/UNSUPPORTED_ACTION|INVALID_ACTION/);
    });
  });
});