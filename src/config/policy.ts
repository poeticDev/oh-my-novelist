import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { AgentType, ModelCategory } from "../llm/types.js";

export const POLICY_CONFIG_FILENAME = "oh-my-novelist.jsonc";

export type ModelFamily = "claude" | "gpt";

const MODEL_ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9._:-]+$/;

const AgentTypeSchema = z.enum([
  "director",
  "concept",
  "worldBuilder",
  "character",
  "plot",
  "scene",
  "dialogue",
  "critic",
  "editor"
]);

const ModelCategorySchema = z.enum([
  "planning",
  "drafting",
  "critique",
  "editing"
]);

const ModelFamilySchema = z.enum(["claude", "gpt"]);

const ModelIdSchema = z.string().regex(
  MODEL_ID_PATTERN,
  "Model ID must be in provider/model format (for example: anthropic/claude-3-5-sonnet-20241022)"
);

const ExplicitModelOverrideSchema = z
  .object({
    modelId: ModelIdSchema,
    reason: z.string().optional()
  })
  .strict();

const GlobalPolicySchema = z
  .object({
    defaultModel: ModelIdSchema.optional(),
    defaultFamily: ModelFamilySchema.optional(),
    fallbackChain: z.array(ModelIdSchema).min(1).optional()
  })
  .strict();

const CategoryPolicySchema = z
  .object({
    defaultModel: ModelIdSchema.optional(),
    defaultFamily: ModelFamilySchema.optional(),
    fallbackChain: z.array(ModelIdSchema).min(1).optional()
  })
  .strict();

const AgentPolicySchema = z
  .object({
    modelOverride: ExplicitModelOverrideSchema.optional(),
    preferredFamily: ModelFamilySchema.optional(),
    fallbackChain: z.array(ModelIdSchema).min(1).optional(),
    disabled: z.boolean().optional()
  })
  .strict();

const FamilyPolicySchema = z
  .object({
    promptVariant: z.string().min(1).optional()
  })
  .strict();

const CategoriesPolicySchema = z
  .object({
    planning: CategoryPolicySchema.optional(),
    drafting: CategoryPolicySchema.optional(),
    critique: CategoryPolicySchema.optional(),
    editing: CategoryPolicySchema.optional()
  })
  .strict();

const AgentsPolicySchema = z
  .object({
    director: AgentPolicySchema.optional(),
    concept: AgentPolicySchema.optional(),
    worldBuilder: AgentPolicySchema.optional(),
    character: AgentPolicySchema.optional(),
    plot: AgentPolicySchema.optional(),
    scene: AgentPolicySchema.optional(),
    dialogue: AgentPolicySchema.optional(),
    critic: AgentPolicySchema.optional(),
    editor: AgentPolicySchema.optional()
  })
  .strict();

const FamiliesPolicySchema = z
  .object({
    claude: FamilyPolicySchema.optional(),
    gpt: FamilyPolicySchema.optional()
  })
  .strict();

export const PluginPolicyConfigSchema = z
  .object({
    version: z.literal("1.0"),
    global: GlobalPolicySchema.optional(),
    categories: CategoriesPolicySchema.optional(),
    agents: AgentsPolicySchema.optional(),
    families: FamiliesPolicySchema.optional()
  })
  .strict();

export type PluginPolicyConfig = z.infer<typeof PluginPolicyConfigSchema>;
export type PolicyResolutionSource =
  | "explicit"
  | "agent"
  | "category"
  | "global"
  | "default";

export interface ResolvedModelPolicy {
  modelId: string;
  family: ModelFamily;
  source: PolicyResolutionSource;
}

export interface LoadedPluginPolicyConfig {
  config: PluginPolicyConfig | null;
  path: string;
}

export const DEFAULT_ANTHROPIC_MODEL =
  "anthropic/claude-3-5-sonnet-20241022";

export function detectModelFamily(modelId: string): ModelFamily {
  const normalized = modelId.toLowerCase();

  if (normalized.includes("/gpt") || normalized.includes("gpt-")) {
    return "gpt";
  }

  return "claude";
}

export function resolvePluginPolicy(
  agentType: AgentType,
  category: ModelCategory,
  policyConfig: PluginPolicyConfig | null,
  explicitModelId?: string,
  unavailableModelIds: string[] = []
): ResolvedModelPolicy {
  const unavailable = new Set(unavailableModelIds);

  if (explicitModelId && !unavailable.has(explicitModelId)) {
    return {
      modelId: explicitModelId,
      family: detectModelFamily(explicitModelId),
      source: "explicit"
    };
  }

  const agentPolicy = policyConfig?.agents?.[agentType];
  const agentOverride = agentPolicy?.modelOverride?.modelId;
  if (agentOverride && !unavailable.has(agentOverride)) {
    return {
      modelId: agentOverride,
      family:
        agentPolicy.preferredFamily ??
        detectModelFamily(agentOverride),
      source: "agent"
    };
  }

  const agentFallback = firstAvailable(agentPolicy?.fallbackChain, unavailable);
  if (agentFallback) {
    return {
      modelId: agentFallback,
      family: detectModelFamily(agentFallback),
      source: "agent"
    };
  }

  const categoryPolicy = policyConfig?.categories?.[category];
  if (categoryPolicy?.defaultModel && !unavailable.has(categoryPolicy.defaultModel)) {
    return {
      modelId: categoryPolicy.defaultModel,
      family:
        categoryPolicy.defaultFamily ??
        detectModelFamily(categoryPolicy.defaultModel),
      source: "category"
    };
  }

  const categoryFallback = firstAvailable(categoryPolicy?.fallbackChain, unavailable);
  if (categoryFallback) {
    return {
      modelId: categoryFallback,
      family: detectModelFamily(categoryFallback),
      source: "category"
    };
  }

  if (policyConfig?.global?.defaultModel && !unavailable.has(policyConfig.global.defaultModel)) {
    return {
      modelId: policyConfig.global.defaultModel,
      family:
        policyConfig.global.defaultFamily ??
        detectModelFamily(policyConfig.global.defaultModel),
      source: "global"
    };
  }

  const globalFallback = firstAvailable(policyConfig?.global?.fallbackChain, unavailable);
  if (globalFallback) {
    return {
      modelId: globalFallback,
      family: detectModelFamily(globalFallback),
      source: "global"
    };
  }

  return {
    modelId: DEFAULT_ANTHROPIC_MODEL,
    family: "claude",
    source: "default"
  };
}

function firstAvailable(
  modelIds: string[] | undefined,
  unavailable: Set<string>
): string | null {
  if (!modelIds) {
    return null;
  }

  for (const modelId of modelIds) {
    if (!unavailable.has(modelId)) {
      return modelId;
    }
  }

  return null;
}

export function loadPluginPolicyConfig(directory: string): LoadedPluginPolicyConfig {
  const path = join(directory, POLICY_CONFIG_FILENAME);

  if (!existsSync(path)) {
    return { config: null, path };
  }

  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(stripJsonComments(raw)) as unknown;
  const config = PluginPolicyConfigSchema.parse(parsed);

  return {
    config,
    path
  };
}

function stripJsonComments(value: string): string {
  return value
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

export {
  AgentTypeSchema,
  ModelCategorySchema,
  ModelFamilySchema,
  ModelIdSchema,
  GlobalPolicySchema,
  CategoryPolicySchema,
  AgentPolicySchema,
  FamiliesPolicySchema
};
