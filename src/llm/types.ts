import type { ProjectState } from "../utils/state.js";

export type AgentType =
  | "director"
  | "concept"
  | "worldBuilder"
  | "character"
  | "plot"
  | "scene"
  | "dialogue"
  | "critic"
  | "editor";

export interface ConversationEntry {
  role: "user" | "assistant";
  agentType?: AgentType;
  content: string;
  timestamp: string;
}

export interface TodoSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

export interface CanonContext {
  project: ProjectState | null;
  todoSummary: TodoSummary | null;
  genre?: string;
  premise?: string;
  worldRules: string[];
  cast: Array<{ name: string; role: string; notes?: string }>;
  timeline: Array<{ title: string; notes?: string }>;
}

export interface SessionSummary {
  text: string;
  updatedAt: string;
}

export interface AgentMemory {
  agentType: AgentType;
  notes: string[];
  lastArtifacts: string[];
  updatedAt?: string;
}

export interface NovelContext {
  canon: CanonContext | null;
  sessionSummary: SessionSummary | null;
  agentMemory: AgentMemory;
  recentConversation: ConversationEntry[];
}

export interface GenerationParams {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface ModelCandidate {
  provider: string;
  model: string;
}

export interface LLMResponse {
  content: string;
  modelId: string;
  degradation: "full" | "reduced" | "offline";
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type ModelCategory = "planning" | "drafting" | "critique" | "editing";
