import type { AgentType, LLMResponse, NovelContext } from "./types.js";
import { resolveGenerationConfig, type GenerationConfig } from "./chains.js";
import { AnthropicClient, AnthropicClientError, createAnthropicClient } from "./anthropic-client.js";
import type { GenerationParams } from "./types.js";

interface CacheEntry {
  response: LLMResponse;
  timestamp: number;
}

interface LLMClientOptions {
  apiKey?: string;
  maxRetries?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface LLMClient {
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
  private cache: Map<string, CacheEntry> = new Map();

  constructor(options: LLMClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.maxRetries = options.maxRetries ?? 3;
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTTL = options.cacheTTL ?? 300_000;
  }

  async generate(
    agentType: AgentType,
    prompt: { system: string; user: string },
    _context?: NovelContext
  ): Promise<LLMResponse> {
    const cacheKey = this.generateCacheKey(agentType, prompt);
    
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    const config = resolveGenerationConfig(agentType);
    
    if (!this.apiKey) {
      return this.createOfflineResponse("No API key provided");
    }

    const response = await this.tryCandidates(config, prompt);
    
    if (response.degradation !== "offline") {
      this.setCachedResponse(cacheKey, response);
    }
    
    return response;
  }

  private async tryCandidates(
    config: GenerationConfig,
    prompt: { system: string; user: string }
  ): Promise<LLMResponse> {
    const candidates = config.candidates;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      if (candidate.provider !== "anthropic") {
        continue;
      }

      try {
        const response = await this.tryCandidateWithRetry(
          candidate.model,
          prompt,
          config.params
        );
        
        return {
          ...response,
          degradation: i === 0 ? "full" : "reduced"
        };
      } catch (error) {
        if (i === candidates.length - 1) {
          const errorMessage = error instanceof Error ? error.message : "All candidates failed";
          return this.createOfflineResponse(errorMessage);
        }
      }
    }

    return this.createOfflineResponse("No valid candidates available");
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

  private generateCacheKey(agentType: AgentType, prompt: { system: string; user: string }): string {
    const data = `${agentType}:${prompt.system}:${prompt.user}`;
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
