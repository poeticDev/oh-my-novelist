import type {
  AgentType,
  GenerationParams,
  ModelCandidate,
  ModelCategory
} from "./types.js";

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

const DEFAULT_CANDIDATES: ModelCandidate[] = [
  { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
  { provider: "anthropic", model: "claude-3-5-haiku-20241022" },
  { provider: "anthropic", model: "claude-3-haiku-20240229" }
];

export const AGENT_FALLBACK_CHAINS: Record<AgentType, ModelCandidate[]> = {
  director: DEFAULT_CANDIDATES,
  concept: DEFAULT_CANDIDATES,
  worldBuilder: DEFAULT_CANDIDATES,
  character: DEFAULT_CANDIDATES,
  plot: DEFAULT_CANDIDATES,
  scene: DEFAULT_CANDIDATES,
  dialogue: DEFAULT_CANDIDATES,
  critic: DEFAULT_CANDIDATES,
  editor: DEFAULT_CANDIDATES
};

export interface GenerationConfig {
  category: ModelCategory;
  params: GenerationParams;
  candidates: ModelCandidate[];
}

export function resolveGenerationConfig(agentType: AgentType): GenerationConfig {
  const category = AGENT_CATEGORIES[agentType];
  
  if (!category) {
    throw new Error(`Unsupported agent type: ${agentType}`);
  }
  
  return {
    category,
    params: CATEGORY_PARAMS[category],
    candidates: AGENT_FALLBACK_CHAINS[agentType]
  };
}
