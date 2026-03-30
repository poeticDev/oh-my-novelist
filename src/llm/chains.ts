import type {
  AgentType,
  GenerationParams,
  ModelCategory
} from "./types.js";
import { DEFAULT_ANTHROPIC_MODEL } from "../config/policy.js";

export const CATEGORY_PARAMS: Record<ModelCategory, GenerationParams> = {
  planning: {
    temperature: 0.8,
    maxTokens: 4096,
    topP: 0.9
  },
  drafting: {
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9
  },
  critique: {
    temperature: 0.3,
    maxTokens: 3072,
    topP: 0.5
  },
  editing: {
    temperature: 0.2,
    maxTokens: 3072,
    topP: 0.3
  }
};

export const AGENT_CATEGORIES: Record<AgentType, ModelCategory> = {
  director: "planning",
  concept: "planning",
  worldBuilder: "planning",
  character: "planning",
  plot: "planning",
  scene: "drafting",
  dialogue: "drafting",
  critic: "critique",
  editor: "editing"
};

export const LEGACY_DEFAULT_MODEL_ID = DEFAULT_ANTHROPIC_MODEL;

export interface GenerationConfig {
  category: ModelCategory;
  params: GenerationParams;
  defaultModelId: string;
}

export function resolveGenerationConfig(agentType: AgentType): GenerationConfig {
  const category = AGENT_CATEGORIES[agentType];
  
  if (!category) {
    throw new Error(`Unsupported agent type: ${agentType}`);
  }
  
  return {
    category,
    params: CATEGORY_PARAMS[category],
    defaultModelId: LEGACY_DEFAULT_MODEL_ID
  };
}
