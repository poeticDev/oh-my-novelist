import { beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { PromptLoader } from "../../src/prompts/loader.js";
import { PromptBuilder } from "../../src/prompts/builder.js";
import type { PromptScaffold, PromptVariables } from "../../src/prompts/types.js";

describe("Model family prompt routing", () => {
  let tempDir: string;
  let loader: PromptLoader;
  let builder: PromptBuilder;
  let scaffold: PromptScaffold;
  let variables: PromptVariables;

  beforeEach(() => {
    tempDir = join(tmpdir(), `prompt-family-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    loader = new PromptLoader(tempDir);
    builder = new PromptBuilder(loader);
    scaffold = {
      role: "Role",
      objective: "Objective",
      contextSections: ["Context"],
      constraints: ["Constraint"],
      outputFormat: "Format"
    };
    variables = {
      userRequest: "Request"
    };
  });

  it("loads a gpt family prompt variant when it exists", () => {
    writeFileSync(join(tempDir, "concept.md"), "DEFAULT PROMPT");
    writeFileSync(join(tempDir, "concept.gpt.md"), "GPT PROMPT");

    expect(loader.load("concept", "gpt")).toBe("GPT PROMPT");
  });

  it("falls back to the default prompt when a family variant does not exist", () => {
    writeFileSync(join(tempDir, "concept.md"), "DEFAULT PROMPT");

    expect(loader.load("concept", "claude")).toBe("DEFAULT PROMPT");
    expect(loader.load("concept")).toBe("DEFAULT PROMPT");
  });

  it("builds a different prompt path for gpt family than the default path", () => {
    writeFileSync(join(tempDir, "concept.md"), "DEFAULT PROMPT");
    writeFileSync(join(tempDir, "concept.gpt.md"), "GPT PROMPT");

    const defaultPrompt = builder.build("concept", scaffold, variables);
    const gptPrompt = builder.build("concept", scaffold, variables, {
      family: "gpt"
    });

    expect(defaultPrompt.system).toContain("DEFAULT PROMPT");
    expect(gptPrompt.system).toContain("GPT PROMPT");
    expect(gptPrompt.system).not.toContain("DEFAULT PROMPT");
  });

  it("preserves the default Anthropic prompt path when no family override is provided", () => {
    writeFileSync(join(tempDir, "concept.md"), "DEFAULT PROMPT");
    writeFileSync(join(tempDir, "concept.gpt.md"), "GPT PROMPT");

    const result = builder.build("concept", scaffold, variables);

    expect(result.system).toContain("DEFAULT PROMPT");
    expect(result.system).not.toContain("GPT PROMPT");
  });
});
