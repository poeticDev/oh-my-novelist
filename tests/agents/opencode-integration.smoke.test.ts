import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { PluginPolicyConfig } from "../../src/config/policy.js";
import { resolveOpenCodeModel } from "../../src/llm/opencode-resolution.js";
import { createLLMClient } from "../../src/llm/factory.js";
import { PromptLoader } from "../../src/prompts/loader.js";
import { PromptBuilder } from "../../src/prompts/builder.js";
import { ContextManager } from "../../src/context/manager.js";
import { EditorAgent } from "../../src/agents/editor.js";
import type { OpenCodeClientLike } from "../../src/llm/opencode-client.js";

describe("OpenCode integration smoke", () => {
  let tempDir: string;
  let loader: PromptLoader;
  let builder: PromptBuilder;

  beforeEach(() => {
    tempDir = join(tmpdir(), `opencode-integration-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    loader = new PromptLoader(tempDir);
    builder = new PromptBuilder(loader);

    writeFileSync(join(tempDir, "editor.md"), "EDITOR DEFAULT PROMPT");
    writeFileSync(join(tempDir, "editor.gpt.md"), "EDITOR GPT PROMPT");
  });

  it("runs openai gpt 4o mini through policy resolution", async () => {
    const policyConfig: PluginPolicyConfig = {
      version: "1.0",
      categories: {
        editing: {
          defaultModel: "openai/gpt-4o-mini",
          defaultFamily: "gpt"
        }
      }
    };

    const resolved = resolveOpenCodeModel({
      agentType: "editor",
      category: "editing",
      policyConfig
    });

    const prompt = builder.build(
      "editor",
      {
        role: "Editor",
        objective: "Refine text",
        contextSections: ["editing"],
        constraints: ["Keep meaning"],
        outputFormat: "text"
      },
      { userRequest: "Revise this paragraph" },
      { family: resolved.family }
    );

    const opencodeClient: OpenCodeClientLike = {
      session: {
        create: vi.fn().mockResolvedValue({ data: { id: "ses_editor" } }),
        prompt: vi
          .fn()
          .mockResolvedValueOnce({ data: { ok: true } })
          .mockResolvedValueOnce({
            data: {
              parts: [{ type: "text", text: "OpenAI editor result" }]
            }
          })
      }
    };

    const client = createLLMClient({
      policyConfig,
      opencodeClient
    });

    const response = await client.generate("editor", prompt);

    expect(resolved).toMatchObject({
      modelId: "openai/gpt-4o-mini",
      family: "gpt",
      source: "category"
    });
    expect(prompt.system).toContain("EDITOR GPT PROMPT");
    expect(response.degradation).toBe("full");
    expect(response.content).toBe("OpenAI editor result");
  });

  it("routes the real editor agent through the gpt prompt family path", async () => {
    const policyConfig: PluginPolicyConfig = {
      version: "1.0",
      categories: {
        editing: {
          defaultModel: "openai/gpt-4o-mini",
          defaultFamily: "gpt"
        }
      }
    };

    const promptCalls: Array<{ noReply?: boolean; parts: Array<{ type: string; text: string }> }> = [];
    const opencodeClient: OpenCodeClientLike = {
      session: {
        create: vi.fn().mockResolvedValue({ data: { id: "ses_agent" } }),
        prompt: vi.fn(async ({ body }: { body: { noReply?: boolean; parts: Array<{ type: "text"; text: string }> } }) => {
          promptCalls.push(body);

          if (body.noReply) {
            return { data: { ok: true } };
          }

          return {
            data: {
              parts: [{ type: "text", text: "Agent result" }]
            }
          };
        })
      }
    };

    const contextManager = new ContextManager({ baseDir: tempDir });
    const llmClient = createLLMClient({ policyConfig, opencodeClient });
    const agent = new EditorAgent();

    const result = await agent.handle("Revise this paragraph", null, {
      directory: tempDir,
      contextManager,
      llmClient
    });

    expect(result).toBe("Agent result");
    expect(promptCalls[0]?.parts[0]?.text).toContain("GPT Family System Prompt");
  });

  it("fails or falls back deterministically when override is unavailable", () => {
    const policyConfig: PluginPolicyConfig = {
      version: "1.0",
      agents: {
        editor: {
          modelOverride: {
            modelId: "openai/gpt-4o-mini"
          },
          preferredFamily: "gpt"
        }
      }
    };

    const resolved = resolveOpenCodeModel({
      agentType: "editor",
      category: "editing",
      policyConfig,
      unavailableModelIds: ["openai/gpt-4o-mini"]
    });

    const prompt = builder.build(
      "editor",
      {
        role: "Editor",
        objective: "Refine text",
        contextSections: ["editing"],
        constraints: ["Keep meaning"],
        outputFormat: "text"
      },
      { userRequest: "Revise this paragraph" },
      { family: resolved.family }
    );

    expect(resolved).toMatchObject({
      modelId: "anthropic/claude-3-5-sonnet-20241022",
      family: "claude",
      source: "default"
    });
    expect(prompt.system).toContain("EDITOR DEFAULT PROMPT");
    expect(prompt.system).not.toContain("EDITOR GPT PROMPT");
  });
});
