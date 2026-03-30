import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginPolicyConfig } from "../../src/config/policy.js";
import type { OpenCodeClientLike } from "../../src/llm/opencode-client.js";

const { generateMock, createAnthropicClientMock } = vi.hoisted(() => ({
  generateMock: vi.fn(),
  createAnthropicClientMock: vi.fn()
}));

vi.mock("../../src/llm/anthropic-client.js", () => ({
  AnthropicClientError: class AnthropicClientError extends Error {
    code: string;
    retryable: boolean;

    constructor(message: string, code: string, retryable = false) {
      super(message);
      this.name = "AnthropicClientError";
      this.code = code;
      this.retryable = retryable;
    }
  },
  createAnthropicClient: createAnthropicClientMock
}));

import { createLLMClient } from "../../src/llm/factory.js";

describe("LLM factory OpenCode bridge", () => {
  beforeEach(() => {
    generateMock.mockReset();
    createAnthropicClientMock.mockReset();
    createAnthropicClientMock.mockReturnValue({
      generate: generateMock
    });
  });

  it("uses the resolved Anthropic default mapping through the shim", async () => {
    generateMock.mockResolvedValue({
      content: "ok",
      modelId: "claude-3-5-sonnet-20241022",
      degradation: "full"
    });

    const client = createLLMClient({ apiKey: "test-key" });
    const response = await client.generate("concept", {
      system: "system",
      user: "user"
    });

    expect(createAnthropicClientMock).toHaveBeenCalledWith(
      "test-key",
      "claude-3-5-sonnet-20241022"
    );
    expect(response.content).toBe("ok");
  });

  it("uses policy config to select an OpenAI secondary path before transport execution", async () => {
    const policyConfig: PluginPolicyConfig = {
      version: "1.0",
      categories: {
        editing: {
          defaultModel: "openai/gpt-4o-mini",
          defaultFamily: "gpt"
        }
      }
    };

    const opencodeClient: OpenCodeClientLike = {
      session: {
        create: vi.fn().mockResolvedValue({ data: { id: "ses_openai" } }),
        prompt: vi
          .fn()
          .mockResolvedValueOnce({ data: { ok: true } })
          .mockResolvedValueOnce({
            data: {
              parts: [{ type: "text", text: "OpenAI success" }]
            }
          })
      }
    };

    const client = createLLMClient({
      policyConfig,
      opencodeClient
    });

    const response = await client.generate("editor", {
      system: "system",
      user: "user"
    });

    expect(createAnthropicClientMock).not.toHaveBeenCalled();
    expect(response.degradation).toBe("full");
    expect(response.content).toBe("OpenAI success");
  });
});
