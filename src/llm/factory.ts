import type { AgentType, LLMResponse, NovelContext } from "./types.js";
import { AGENT_CATEGORIES, CATEGORY_PARAMS } from "./chains.js";
import { AnthropicClientError, createAnthropicClient } from "./anthropic-client.js";
import type { GenerationParams } from "./types.js";
import { resolveOpenCodeModel } from "./opencode-resolution.js";
import type { PluginPolicyConfig } from "../config/policy.js";
import { executeWithOpenCode, type OpenCodeClientLike } from "./opencode-client.js";
import type { ResolvedModelPolicy } from "../config/policy.js";

interface CacheEntry {
  response: LLMResponse;
  timestamp: number;
}

interface LLMClientOptions {
  apiKey?: string;
  maxRetries?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  policyConfig?: PluginPolicyConfig | null;
  opencodeClient?: OpenCodeClientLike;
}

export interface LLMClient {
  resolveModel(agentType: AgentType, unavailableModelIds?: string[]): ResolvedModelPolicy;
  generate(
    agentType: AgentType,
    prompt: { system: string; user: string },
    context?: NovelContext
  ): Promise<LLMResponse>;
}

class ResilientLLMClient implements LLMClient {
  private apiKey: string | undefined;
  private maxRetries: number;
  private cacheEnabled: boolean;
  private cacheTTL: number;
  private policyConfig: PluginPolicyConfig | null;
  private opencodeClient?: OpenCodeClientLike;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(options: LLMClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.maxRetries = options.maxRetries ?? 3;
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTTL = options.cacheTTL ?? 300_000;
    this.policyConfig = options.policyConfig ?? null;
    this.opencodeClient = options.opencodeClient;
  }

  resolveModel(agentType: AgentType, unavailableModelIds: string[] = []): ResolvedModelPolicy {
    const category = AGENT_CATEGORIES[agentType];

    return resolveOpenCodeModel({
      agentType,
      category,
      policyConfig: this.policyConfig,
      unavailableModelIds
    });
  }

  async generate(
    agentType: AgentType,
    prompt: { system: string; user: string },
    _context?: NovelContext
  ): Promise<LLMResponse> {
    const category = AGENT_CATEGORIES[agentType];
    const params = CATEGORY_PARAMS[category];
    const unavailableModelIds: string[] = [];
    const attemptedModelIds = new Set<string>();

    let resolved = this.resolveModel(agentType);

    let cacheKey = this.generateCacheKey(agentType, prompt, resolved.modelId);
    
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.opencodeClient && !this.apiKey) {
      return this.createOfflineResponse("No API key provided");
    }

    let response: LLMResponse = this.createOfflineResponse("No valid model candidates available");

    while (!attemptedModelIds.has(resolved.modelId)) {
      attemptedModelIds.add(resolved.modelId);

      response = await this.tryResolvedModel(resolved.modelId, prompt, params);

      if (response.degradation !== "offline") {
        const finalResponse = attemptedModelIds.size > 1
          ? { ...response, degradation: "reduced" as const }
          : response;
        cacheKey = this.generateCacheKey(agentType, prompt, resolved.modelId);
        this.setCachedResponse(cacheKey, finalResponse);
        return finalResponse;
      }

      unavailableModelIds.push(resolved.modelId);
      resolved = this.resolveModel(agentType, unavailableModelIds);
    }

    return response;
  }

  private async tryResolvedModel(
    resolvedModelId: string,
    prompt: { system: string; user: string },
    params: GenerationParams
  ): Promise<LLMResponse> {
    if (this.opencodeClient) {
      try {
        return await executeWithOpenCode(this.opencodeClient, resolvedModelId, prompt);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "OpenCode execution failed";
        return this.createOfflineResponse(errorMessage);
      }
    }

    const anthropicModel = resolvedModelId.slice("anthropic/".length);

    try {
      return await this.tryCandidateWithRetry(
        anthropicModel,
        prompt,
        params
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Resolved model failed";
      return this.createOfflineResponse(errorMessage);
    }
  }

  private async tryCandidateWithRetry(
    model: string,
    prompt: { system: string; user: string },
    params: GenerationParams,
    attempt = 1
  ): Promise<LLMResponse> {
    try {
      const client = createAnthropicClient(this.apiKey!, model);
      return await client.generate(prompt, params);
    } catch (error) {
      if (error instanceof AnthropicClientError && error.retryable && attempt < this.maxRetries) {
        await this.delay(Math.pow(2, attempt) * 1000);
        return this.tryCandidateWithRetry(model, prompt, params, attempt + 1);
      }
      throw error;
    }
  }

  private createOfflineResponse(errorMessage: string): LLMResponse {
    return {
      content: "[Offline Mode] Unable to generate response. Please check your API key or network connection.",
      modelId: "offline",
      degradation: "offline",
      error: errorMessage
    };
  }

  private generateCacheKey(
    agentType: AgentType,
    prompt: { system: string; user: string },
    modelId: string
  ): string {
    const data = `${agentType}:${modelId}:${prompt.system}:${prompt.user}`;
    return this.hashString(data);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private getCachedResponse(cacheKey: string): LLMResponse | null {
    if (!this.cacheEnabled) {
      return null;
    }

    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.response;
  }

  private setCachedResponse(cacheKey: string, response: LLMResponse): void {
    if (!this.cacheEnabled) {
      return;
    }

    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createLLMClient(options?: LLMClientOptions): LLMClient {
  return new ResilientLLMClient(options);
}
