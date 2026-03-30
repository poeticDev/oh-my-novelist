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
});
