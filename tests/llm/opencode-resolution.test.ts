import { describe, expect, it } from "vitest";
import type { PluginPolicyConfig } from "../../src/config/policy.js";
import {
  resolveOpenCodeModel,
  isPluginOwnedProviderDispatch
} from "../../src/llm/opencode-resolution.js";

describe("OpenCode-native model resolution", () => {
  it("preserves Anthropic-first default mapping when no plugin policy config is present", () => {
    const resolved = resolveOpenCodeModel({
      agentType: "concept",
      category: "planning",
      policyConfig: null
    });

    expect(resolved).toMatchObject({
      modelId: "anthropic/claude-3-5-sonnet-20241022",
      source: "default",
      family: "claude"
    });
  });

  it("applies precedence global -> category -> agent -> explicit override", () => {
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

    expect(
      resolveOpenCodeModel({
        agentType: "concept",
        category: "planning",
        policyConfig
      })
    ).toMatchObject({
      modelId: "openai/gpt-4o-mini",
      source: "agent",
      family: "gpt"
    });

    expect(
      resolveOpenCodeModel({
        agentType: "director",
        category: "planning",
        policyConfig
      })
    ).toMatchObject({
      modelId: "anthropic/claude-3-5-sonnet-20241022",
      source: "category",
      family: "claude"
    });

    expect(
      resolveOpenCodeModel({
        agentType: "director",
        category: "editing",
        policyConfig,
        explicitModelId: "openai/gpt-4o-mini"
      })
    ).toMatchObject({
      modelId: "openai/gpt-4o-mini",
      source: "explicit",
      family: "gpt"
    });
  });

  it("handles unavailable overrides deterministically", () => {
    const policyConfig: PluginPolicyConfig = {
      version: "1.0",
      agents: {
        critic: {
          modelOverride: {
            modelId: "openai/gpt-4o-mini"
          },
          fallbackChain: ["anthropic/claude-3-5-haiku-20241022"]
        }
      }
    };

    const resolved = resolveOpenCodeModel({
      agentType: "critic",
      category: "critique",
      policyConfig,
      unavailableModelIds: ["openai/gpt-4o-mini"]
    });

    expect(resolved).toMatchObject({
      modelId: "anthropic/claude-3-5-haiku-20241022",
      source: "agent",
      family: "claude"
    });
  });

  it("consumes fallbackChain entries before dropping to the compatibility default", () => {
    const policyConfig: PluginPolicyConfig = {
      version: "1.0",
      global: {
        fallbackChain: [
          "openai/gpt-4o-mini",
          "anthropic/claude-3-5-haiku-20241022"
        ],
        defaultFamily: "gpt"
      }
    };

    const resolved = resolveOpenCodeModel({
      agentType: "director",
      category: "planning",
      policyConfig,
      unavailableModelIds: ["openai/gpt-4o-mini"]
    });

    expect(resolved).toMatchObject({
      modelId: "anthropic/claude-3-5-haiku-20241022",
      source: "global",
      family: "claude"
    });
  });

  it("proves a secondary OpenAI path using gpt-4o-mini can resolve through policy", () => {
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

    expect(resolved).toMatchObject({
      modelId: "openai/gpt-4o-mini",
      source: "category",
      family: "gpt"
    });
  });

  it("asserts primary provider dispatch is no longer plugin-owned", () => {
    expect(isPluginOwnedProviderDispatch()).toBe(false);
  });
});
