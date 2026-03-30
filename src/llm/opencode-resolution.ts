import type { AgentType, ModelCategory } from "./types.js";
import {
  resolvePluginPolicy,
  type PluginPolicyConfig,
  type ResolvedModelPolicy
} from "../config/policy.js";

export interface OpenCodeResolutionInput {
  agentType: AgentType;
  category: ModelCategory;
  policyConfig: PluginPolicyConfig | null;
  explicitModelId?: string;
  unavailableModelIds?: string[];
}

export function resolveOpenCodeModel(
  input: OpenCodeResolutionInput
): ResolvedModelPolicy {
  return resolvePluginPolicy(
    input.agentType,
    input.category,
    input.policyConfig,
    input.explicitModelId,
    input.unavailableModelIds ?? []
  );
}

export function isPluginOwnedProviderDispatch(): boolean {
  return false;
}
