import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = process.cwd();

function readDoc(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("docs migration guidance", () => {
  it("points provider setup to OpenCode-native flows", () => {
    const readme = readDoc("README.md");
    const configuration = readDoc("CONFIGURATION.md");

    expect(readme).toContain("/connect");
    expect(readme).toContain("/models");
    expect(configuration).toContain("/connect");
    expect(configuration).toContain("/models");
  });

  it("describes oh-my-novelist.jsonc as policy-only config", () => {
    const readme = readDoc("README.md");
    const configuration = readDoc("CONFIGURATION.md");

    expect(readme).toContain("oh-my-novelist.jsonc");
    expect(configuration).toContain("oh-my-novelist.jsonc");
    expect(configuration).toContain("apiKey");
    expect(configuration).toContain("provider");
  });

  it("keeps Anthropc env guidance only as compatibility messaging", () => {
    const envExample = readDoc(".env.example");

    expect(envExample).toContain("compatibility");
    expect(envExample).toContain("/connect");
  });

  describe("guided setup canonical path assertions", () => {
    it("documents novelist_setup as the canonical setup tool", () => {
      const readme = readDoc("README.md");
      const configuration = readDoc("CONFIGURATION.md");

      expect(readme).toContain("novelist_setup");
      expect(configuration).toContain("novelist_setup");
    });

    it("describes oh-my-novelist.jsonc as the canonical config file", () => {
      const readme = readDoc("README.md");
      const configuration = readDoc("CONFIGURATION.md");

      expect(readme).toMatch(/oh-my-novelist\.jsonc/);
      expect(configuration).toMatch(/oh-my-novelist\.jsonc/);
    });

    it("does not have active instructions for llm.config.json", () => {
      const readme = readDoc("README.md");
      const configuration = readDoc("CONFIGURATION.md");

      // llm.config.json should only appear in historical context, not active instructions
      const readmeActiveContext = readme.split(/## \w+/)[0] || readme;
      const configActiveContext = configuration.split(/## \w+/)[0] || configuration;

      expect(readmeActiveContext).not.toMatch(/create.*llm\.config\.json|write.*llm\.config\.json/i);
      expect(configActiveContext).not.toMatch(/create.*llm\.config\.json|write.*llm\.config\.json/i);
    });

    it("documents inspect/preview/apply actions for setup", () => {
      const readme = readDoc("README.md");
      const configuration = readDoc("CONFIGURATION.md");

      const setupDocs = readme + configuration;

      expect(setupDocs).toContain("inspect");
      expect(setupDocs).toContain("preview");
      expect(setupDocs).toContain("apply");
    });

    it("clarifies OpenCode owns provider/runtime setup", () => {
      const readme = readDoc("README.md");
      const configuration = readDoc("CONFIGURATION.md");

      const combinedDocs = readme + configuration;

      expect(combinedDocs).toMatch(/OpenCode.*(provider|runtime|setup)/i);
      expect(combinedDocs).not.toMatch(/plugin.*(provider|runtime).*setup/i);
    });
  });
});
