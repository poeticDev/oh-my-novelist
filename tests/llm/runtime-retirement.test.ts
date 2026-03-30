import { describe, expect, it } from "vitest";
import { resolveGenerationConfig, LEGACY_DEFAULT_MODEL_ID } from "../../src/llm/chains.js";
import { isPluginOwnedProviderDispatch } from "../../src/llm/opencode-resolution.js";

describe("runtime retirement", () => {
  it("no longer exposes hardcoded fallback candidates as the primary runtime contract", () => {
    const config = resolveGenerationConfig("director");

    expect(config).toHaveProperty("defaultModelId", LEGACY_DEFAULT_MODEL_ID);
    expect(config).not.toHaveProperty("candidates");
  });

  it("marks provider dispatch as no longer plugin-owned", () => {
    expect(isPluginOwnedProviderDispatch()).toBe(false);
  });
});
