import type { ContextManager } from "../context/manager.js";
import type { LLMClient } from "../llm/factory.js";

export interface AgentContext {
  directory: string;
  contextManager: ContextManager;
  llmClient: LLMClient;
}

export interface BaseAgent {
  name: string;
  description: string;
  handle(content: string, project: string | null, context: AgentContext): Promise<string>;
}
