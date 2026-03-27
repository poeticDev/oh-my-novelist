/**
 * Director Smoke Tests
 *
 * These tests verify basic Director functionality without requiring LLM calls.
 * They ensure the core routing and messaging works correctly.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DirectorAgent } from "../../src/agents/director.js";
import type { BaseAgent, AgentContext } from "../../src/agents/base.js";
import type { TodoManagerTool } from "../../src/tools/todo-manager.js";
import type { ContextManager } from "../../src/context/manager.js";
import type { LLMClient } from "../../src/llm/factory.js";

describe("Director Smoke Tests", () => {
  let director: DirectorAgent;
  let mockContext: AgentContext;
  let mockAgents: Record<string, BaseAgent>;

  beforeEach(() => {
    director = new DirectorAgent();

    // Mock TodoManager
    const mockTodoManager = {
      listTodos: () => ({
        success: true,
        todos: [],
      }),
      getProgress: () => ({
        success: true,
        progress: {
          percentage: 0,
          completed: 0,
          total: 8,
          byPhase: {},
        },
      }),
    };

    // Mock context with minimal implementations
    mockContext = {
      directory: "/tmp/test",
      contextManager: {
        build: () => ({
          canon: {
            project: null,
            todoSummary: null,
            worldRules: [],
            cast: [],
            timeline: [],
          },
          sessionSummary: null,
          agentMemory: {
            agentType: "director",
            notes: [],
            lastArtifacts: [],
          },
          recentConversation: [],
        }),
        ...mockTodoManager,
      } as unknown as ContextManager,
      llmClient: {} as LLMClient,
    };

    // Mock specialist agents
    mockAgents = {
      concept: {
        name: "Concept",
        description: "기획 에이전트",
        handle: async () => "[Concept Agent Response]",
      },
      worldBuilder: {
        name: "World Builder",
        description: "세계관 설계사",
        handle: async () => "[World Builder Response]",
      },
      character: {
        name: "Character",
        description: "캐릭터 디자이너",
        handle: async () => "[Character Designer Response]",
      },
      plot: {
        name: "Plot",
        description: "플롯 설계사",
        handle: async () => "[Plot Architect Response]",
      },
      scene: {
        name: "Scene",
        description: "장면 작가",
        handle: async () => "[Scene Writer Response]",
      },
      dialogue: {
        name: "Dialogue",
        description: "대화 작가",
        handle: async () => "[Dialogue Writer Response]",
      },
      critic: {
        name: "Critic",
        description: "리뷰어",
        handle: async () => "[Critic Response]",
      },
      editor: {
        name: "Editor",
        description: "편집자",
        handle: async () => "[Editor Response]",
      },
    };
  });

  describe("Greeting Flows (No LLM Required)", () => {
    it("should handle Korean greeting without LLM", async () => {
      const response = await director.handle(
        "안녕하세요",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("환영합니다");
      expect(response).toContain("novelist_init_project");
    });

    it("should handle English greeting without LLM", async () => {
      const response = await director.handle(
        "hello",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("환영합니다");
    });

    it("should handle '시작' keyword without LLM", async () => {
      const response = await director.handle(
        "시작",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("환영합니다");
    });

    it("should return welcome message for existing project", async () => {
      const response = await director.handle(
        "안녕",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("Test Project");
      expect(response).toContain("현재 프로젝트");
      expect(response).toContain("@concept");
    });
  });

  describe("Status Command (No LLM Required)", () => {
    it("should handle '상태' command without LLM", async () => {
      const response = await director.handle(
        "상태",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("진행 중인 프로젝트가 없습니다");
    });

    it("should handle '진행' command without LLM", async () => {
      const response = await director.handle(
        "진행",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("진행 중인 프로젝트가 없습니다");
    });

    it("should handle 'progress' command without LLM", async () => {
      const response = await director.handle(
        "progress",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("진행 중인 프로젝트가 없습니다");
    });

    it("should handle '상황' command without LLM", async () => {
      const response = await director.handle(
        "상황",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("진행 중인 프로젝트가 없습니다");
    });
  });

  describe("Agent Routing (No LLM Required)", () => {
    it("should route to @concept agent", async () => {
      const response = await director.handle(
        "@concept 현대 판타지 아이디어",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("기획 에이전트의 응답");
      expect(response).toContain("[Concept Agent Response]");
    });

    it("should route to @world agent", async () => {
      const response = await director.handle(
        "@world 마법 시스템",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("세계관 설계사의 응답");
      expect(response).toContain("[World Builder Response]");
    });

    it("should route to @character agent", async () => {
      const response = await director.handle(
        "@character 주인공",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("캐릭터 디자이너의 응답");
      expect(response).toContain("[Character Designer Response]");
    });

    it("should route to @plot agent", async () => {
      const response = await director.handle(
        "@plot 3막 구조",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("플롯 설계사의 응답");
      expect(response).toContain("[Plot Architect Response]");
    });

    it("should route to @scene agent", async () => {
      const response = await director.handle(
        "@scene 1화",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("장면 작가의 응답");
      expect(response).toContain("[Scene Writer Response]");
    });

    it("should route to @dialogue agent", async () => {
      const response = await director.handle(
        "@dialogue 대화",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("대화 작가의 응답");
      expect(response).toContain("[Dialogue Writer Response]");
    });

    it("should route to @critic agent", async () => {
      const response = await director.handle(
        "@critic 검토",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("검토 에이전트의 응답");
      expect(response).toContain("[Critic Response]");
    });

    it("should route to @editor agent", async () => {
      const response = await director.handle(
        "@editor 편집",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("편집 에이전트의 응답");
      expect(response).toContain("[Editor Response]");
    });

    it("should route by Korean keywords", async () => {
      const response = await director.handle(
        "기획 아이디어",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("기획 에이전트의 응답");
    });

    it("should route by Korean keywords for world", async () => {
      const response = await director.handle(
        "세계관 설정",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("세계관 설계사의 응답");
    });
  });

  describe("Help Command (No LLM Required)", () => {
    it("should handle 'help' command without LLM", async () => {
      const response = await director.handle(
        "help",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("사용법");
      expect(response).toContain("@concept");
      expect(response).toContain("@world");
    });

    it("should handle '도움' command without LLM", async () => {
      const response = await director.handle(
        "도움",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("사용법");
    });

    it("should handle '?' command without LLM", async () => {
      const response = await director.handle(
        "?",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("사용법");
    });

    it("should handle '사용법' command without LLM", async () => {
      const response = await director.handle(
        "사용법",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("사용법");
    });
  });

  describe("Default Response (No LLM Required)", () => {
    it("should return default response for unknown input without project", async () => {
      const response = await director.handle(
        "random input",
        null,
        mockAgents,
        mockContext
      );

      expect(response).toContain("프로젝트를 먼저 시작해 주세요");
      expect(response).toContain("novelist_init_project");
    });

    it("should return default response for unknown input with project", async () => {
      const response = await director.handle(
        "random input",
        "Test Project",
        mockAgents,
        mockContext
      );

      expect(response).toContain("Test Project");
      expect(response).toContain("어떤 작업을 도와드릴까요");
    });
  });

  describe("Agent Properties", () => {
    it("should have correct name", () => {
      expect(director.name).toBe("Director");
    });

    it("should have correct description", () => {
      expect(director.description).toBe("웹소설 창작의 단일 진입점");
    });
  });
});
