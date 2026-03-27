import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type {
  AgentType,
  ConversationEntry,
  NovelContext,
  CanonContext,
  TodoSummary,
  AgentMemory,
} from "../llm/types.js";
import { getProjectState, type ProjectState } from "../utils/state.js";

interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  phase: string;
}

interface TodoData {
  todos: TodoItem[];
  updatedAt: string;
}

interface ContextManagerOptions {
  baseDir: string;
  maxConversationTurns?: number;
}

interface ContextInfo {
  conversationCount: number;
  estimatedTokens: number;
}

/**
 * ContextManager manages runtime NovelContext for agents.
 *
 * Responsibilities:
 * - Assemble canonical context from persisted ProjectState and todo data
 * - Maintain per-project conversation history (in-memory for MVP)
 * - Truncate conversation to configured window
 * - Provide context isolation between projects
 *
 * Note: This is plugin-scoped, not agent-scoped. Injected via AgentContext.
 */
export class ContextManager {
  private baseDir: string;
  private maxConversationTurns: number;
  private conversations: Map<string, ConversationEntry[]>;

  constructor(options: ContextManagerOptions) {
    this.baseDir = options.baseDir;
    this.maxConversationTurns = options.maxConversationTurns ?? 10;
    this.conversations = new Map();
  }

  /**
   * Build a complete NovelContext for an agent working on a project.
   *
   * @param agentType - The type of agent requesting context
   * @param projectName - The project name, or null for no project
   * @returns Assembled NovelContext
   */
  build(agentType: AgentType, projectName: string | null): NovelContext {
    const project = projectName
      ? getProjectState(this.baseDir, projectName)
      : null;

    const todoSummary = projectName
      ? this.buildTodoSummary(projectName)
      : null;

    const canon: CanonContext = {
      project,
      todoSummary,
      worldRules: [],
      cast: [],
      timeline: [],
    };

    const agentMemory: AgentMemory = {
      agentType,
      notes: [],
      lastArtifacts: [],
    };

    const recentConversation = projectName
      ? this.getRecentConversation(projectName)
      : [];

    return {
      canon,
      sessionSummary: null, // MVP: memory-only, no persistence
      agentMemory,
      recentConversation,
    };
  }

  /**
   * Record a conversation turn for a project.
   *
   * @param projectName - The project name
   * @param entry - The conversation entry to record
   */
  recordTurn(projectName: string, entry: ConversationEntry): void {
    const existing = this.conversations.get(projectName) ?? [];
    existing.push(entry);
    this.conversations.set(projectName, existing);
  }

  /**
   * Clear all context for a project.
   *
   * @param projectName - The project name to clear
   */
  clearProject(projectName: string): void {
    this.conversations.delete(projectName);
  }

  /**
   * Get context information for a project.
   *
   * @param projectName - The project name
   * @returns Context size information
   */
  getContextInfo(projectName: string): ContextInfo {
    const conversation = this.conversations.get(projectName) ?? [];
    const conversationCount = conversation.length;

    // Rough token estimation: ~4 chars per token on average
    const totalChars = conversation.reduce(
      (sum, entry) => sum + entry.content.length,
      0
    );
    const estimatedTokens = Math.ceil(totalChars / 4);

    return {
      conversationCount,
      estimatedTokens,
    };
  }

  /**
   * Get the recent conversation history for a project, truncated to window.
   *
   * @param projectName - The project name
   * @returns Truncated conversation entries
   */
  private getRecentConversation(projectName: string): ConversationEntry[] {
    const conversation = this.conversations.get(projectName) ?? [];
    // Return last N turns (each turn is one entry)
    return conversation.slice(-this.maxConversationTurns);
  }

  /**
   * Build a todo summary from project todos.
   *
   * @param projectName - The project name
   * @returns TodoSummary or null if no todos
   */
  private buildTodoSummary(projectName: string): TodoSummary | null {
    const todos = this.loadTodos(projectName);
    if (todos.length === 0) {
      return null;
    }

    const completed = todos.filter((t) => t.status === "completed").length;
    const inProgress = todos.filter((t) => t.status === "in_progress").length;
    const pending = todos.filter((t) => t.status === "pending").length;

    return {
      total: todos.length,
      completed,
      inProgress,
      pending,
    };
  }

  /**
   * Load todos from disk for a project.
   *
   * @param projectName - The project name
   * @returns Array of todo items
   */
  private loadTodos(projectName: string): TodoItem[] {
    const todoPath = join(
      this.baseDir,
      ".oh-my-novelist/todos",
      `${projectName}.json`
    );
    if (!existsSync(todoPath)) {
      return [];
    }
    const data = JSON.parse(readFileSync(todoPath, "utf-8")) as TodoData;
    return data.todos;
  }
}

export type { ContextManagerOptions, ContextInfo };
