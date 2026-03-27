import type { LLMResponse, GenerationParams } from "./types.js";

  export class AnthropicClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "AnthropicClientError";
  }
}

  interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

interface AnthropicResponse {
  id: string;
  content: AnthropicContentBlock[];
  usage: AnthropicUsage;
}

  export class AnthropicClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options: { apiKey: string; model: string }) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = "https://api.anthropic.com/v1/messages";
  }

  async generate(
    prompt: { system: string; user: string },
    params: GenerationParams
  ): Promise<LLMResponse> {
    try {
      const messages: AnthropicMessage[] = [
        { role: "user", content: prompt.user }
      ];

      const response = await this.makeRequest(messages, prompt.system, params);

      return this.parseResponse(response);
    } catch (error) {
      if (error instanceof AnthropicClientError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new AnthropicClientError(
        `Anthropic API error: ${errorMessage}`,
        "API_ERROR",
        true
      );
    }
  }

  private async makeRequest(
    messages: AnthropicMessage[],
    system: string,
    params: GenerationParams
  ): Promise<AnthropicResponse> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        system,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        top_p: params.topP
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string; type?: string } };
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      const errorCode = errorData.error?.type || "API_ERROR";
      const retryable = this.isRetryableError(response.status, errorCode);
      
      throw new AnthropicClientError(
        errorMessage,
        errorCode,
        retryable
      );
    }

    const data = await response.json() as AnthropicResponse;
    return data;
  }

  private isRetryableError(statusCode: number, errorCode: string): boolean {
    if (statusCode === 429) return true;
    if (statusCode === 529) return true;
    if (statusCode >= 500 && statusCode < 600) return true;
    if (statusCode === 401) return false;
    if (statusCode === 403) return false;
    
    return true;
  }

  private parseResponse(response: AnthropicResponse): LLMResponse {
    const contentBlock = response.content.find(c => c.type === "text");
    const content = contentBlock?.text || "";

    return {
      content,
      modelId: this.model,
      degradation: "full",
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      }
    };
  }
}

export function createAnthropicClient(
  apiKey: string,
  model: string
): AnthropicClient {
  if (!apiKey || apiKey.trim() === "") {
    throw new AnthropicClientError(
      "API key is required",
      "MISSING_API_KEY",
      false
    );
  }

  return new AnthropicClient({ apiKey, model });
}
