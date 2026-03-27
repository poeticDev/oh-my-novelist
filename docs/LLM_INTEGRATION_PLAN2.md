---
Oh My Novelist - LLM 통합 최종 설계 문서
버전: 1.0 (Final Design)  
작성일: 2026-03-24  
상태: 설계 완료, 구현 대기
---
📋 Executive Summary
목표
oh-my-novelist의 9개 에이전트에 LLM 통합을 통해 정적 응답 → 동적 AI 생성 응답 전환
핵심 설계 원칙
1. Graceful Degradation: LLM 실패 시 정적 프롬프트로 폴백
2. Vendor Agnostic: OpenCode SDK 우선, Anthropic 폴백
3. Context Injection: 프로젝트 상태 + Todo 진행 + 대화 기록
4. Incremental Rollout: ConceptAgent MVP → 전체 확장
예상 소요
- 총 기간: 13-15일
- MVP 완료: 6-7일 (ConceptAgent까지)
- Full Integration: 13일 (9개 에이전트)
---
🏗️ 아키텍처 개요
변경 전 (현재)
User Input → Director → Agent Selection → Static Prompt File → Return
변경 후 (목표)
User Input → Director → Agent Selection
                    ↓
            Context Building (Project + Todos + Conversation)
                    ↓
            Dynamic Prompt Generation (Template + Variables)
                    ↓
            LLM Call → Streaming Response → Return
                    ↓
            [Failure] Static Prompt Fallback
---
📁 새 파일 구조
src/
├── llm/
│   ├── types.ts              # LLM 인터페이스 정의
│   ├── opencode-client.ts    # OpenCode SDK 구현
│   ├── anthropic-client.ts   # Anthropic API 폴백
│   └── factory.ts            # 클라이언트 팩토리
├── prompts/
│   ├── types.ts              # 프롬프트 변수 타입
│   ├── loader.ts             # 프롬프트 파일 로더
│   ├── builder.ts            # 동적 프롬프트 빌더
│   └── variables.ts          # 변수 정의 및 포맷터
├── context/
│   └── manager.ts            # 컨텍스트 관리
└── agents/                   # 기존 에이전트 수정
    ├── base.ts               # LLM 주입 인터페이스
    ├── concept.ts            # LLM 통합 예시
    └── [others].ts           # 동일 패턴 적용
---
🔧 Phase 상세 설계
Phase 0: 환경 준비 (0.5일)
작업:
1. Anthropic SDK 설치: npm install @anthropic-ai/sdk
2. 디렉토리 생성: mkdir -p src/llm src/prompts src/context
3. 환경 변수 파일 생성: .env.example
.env.example:
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-... # optional
---
Phase 1: LLM 클라이언트 (2일)
핵심 인터페이스:
// src/llm/types.ts
export interface LLMClient {
  generate(
    agentType: string,
    prompt: string,
    context: NovelContext
  ): Promise<string>;
}
export interface NovelContext {
  project: ProjectState | null;
  todos: TodoItem[];
  conversation: string[];      // 최근 10개 메시지
  agentMemory: Record<string, unknown>;
}
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  error?: string;
}
Anthropic 클라이언트 구현:
// src/llm/anthropic-client.ts
import Anthropic from "@anthropic-ai/sdk";
export class AnthropicLLMClient implements LLMClient {
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  async generate(
    agentType: string,
    prompt: string,
    context: NovelContext
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: this.buildSystemPrompt(agentType, context) + "\n\n" + prompt
      }]
    });
    
    return response.content[0].text;
  }
  private buildSystemPrompt(agentType: string, context: NovelContext): string {
    const phaseName = context.project?.currentPhase || "planning";
    return `당신은 ${agentType} 에이전트입니다. 
현재 프로젝트: ${context.project?.name || "미정"}
현재 단계: ${phaseName}
Todo 진행: ${context.todos.filter(t => t.status === "completed").length}/${context.todos.length}`;
  }
}
팩토리 구현:
// src/llm/factory.ts
export class LLMClientFactory {
  static create(preferred?: "opencode" | "anthropic"): LLMClient {
    // 1. OpenCode SDK 확인
    if (preferred !== "anthropic" && this.isOpenCodeAvailable()) {
      return new OpenCodeLLMClient();
    }
    
    // 2. Anthropic API 확인
    if (process.env.ANTHROPIC_API_KEY) {
      return new AnthropicLLMClient(process.env.ANTHROPIC_API_KEY);
    }
    
    // 3. 실패
    throw new Error("No LLM client available");
  }
  private static isOpenCodeAvailable(): boolean {
    // OpenCode SDK LLM 지원 여부 확인 로직
    return false; // 초기 구현 시
  }
}
---
Phase 2: 프롬프트 빌더 (1.5일)
변수 타입:
// src/prompts/variables.ts
export interface PromptVariables {
  projectName: string;
  currentPhase: string;
  todoProgress: string;
  userRequest: string;
  conversationHistory?: string;
}
export const PHASE_NAMES: Record<string, string> = {
  planning: "기획",
  worldbuilding: "세계관",
  character: "캐릭터",
  plotting: "플롯",
  writing: "집필",
  editing: "편집"
};
빌더 구현:
// src/prompts/builder.ts
import { readFileSync } from "fs";
import { join } from "path";
export function buildPrompt(
  agentType: string,
  variables: PromptVariables
): string {
  const template = loadPromptFile(agentType);
  return interpolate(template, variables);
}
function interpolate(template: string, variables: PromptVariables): string {
  let result = template;
  
  result = result.replace(/{{projectName}}/g, variables.projectName || "미정");
  result = result.replace(/{{currentPhase}}/g, variables.currentPhase || "planning");
  result = result.replace(/{{todoProgress}}/g, variables.todoProgress || "0/0");
  result = result.replace(/{{userRequest}}/g, variables.userRequest);
  
  if (variables.conversationHistory) {
    result = result.replace(/{{conversationHistory}}/g, variables.conversationHistory);
  } else {
    result = result.replace(/{{conversationHistory}}\n?/g, "");
  }
  
  return result;
}
export function formatTodoProgress(completed: number, total: number): string {
  if (total === 0) return "0/0";
  return `${completed}/${total} (${Math.round((completed / total) * 100)}%)`;
}
function loadPromptFile(agentType: string): string {
  const promptPath = join(process.cwd(), "src", "agents", "prompts", `${agentType}.md`);
  try {
    return readFileSync(promptPath, "utf-8");
  } catch {
    return `당신은 ${agentType} 전문가입니다.`;
  }
}
---
Phase 3: ConceptAgent MVP (3일)
BaseAgent 인터페이스 업데이트:
// src/agents/base.ts
import type { LLMClient } from "../llm/types.js";
export interface BaseAgent {
  name: string;
  description: string;
  handle(
    content: string,
    project: string | null,
    context?: {
      llmClient?: LLMClient;
      directory?: string;
    }
  ): Promise<string>;
}
ConceptAgent 구현:
// src/agents/concept.ts
import type { BaseAgent } from "./base.js";
import type { LLMClient, NovelContext } from "../llm/types.js";
import { buildPrompt, formatTodoProgress } from "../prompts/builder.js";
import { getProjectState } from "../utils/state.js";
import { TodoManagerTool, type TodoItem } from "../tools/todo-manager.js";
export class ConceptAgent implements BaseAgent {
  readonly name = "Concept";
  readonly description = "웹소설 기획 전문가";
  async handle(
    content: string,
    project: string | null,
    context?: { llmClient?: LLMClient; directory?: string }
  ): Promise<string> {
    try {
      // 1. 컨텍스트 구성
      const ctx = await this.buildContext(project, context?.directory);
      
      // 2. 프롬프트 생성
      const prompt = buildPrompt("concept", {
        projectName: project || "미정",
        currentPhase: ctx.project?.currentPhase || "planning",
        todoProgress: formatTodoProgress(ctx.completedTodos, ctx.totalTodos),
        userRequest: content
      });
      
      // 3. LLM 호출
      const llm = context?.llmClient;
      if (!llm) {
        throw new Error("LLM client not available");
      }
      
      const response = await llm.generate("concept", prompt, {
        project: ctx.project,
        todos: ctx.todos,
        conversation: [],
        agentMemory: {}
      });
      
      return response;
      
    } catch (error) {
      console.warn("LLM failed, using fallback:", error);
      return this.getStaticFallback();
    }
  }
  private async buildContext(project: string | null, directory?: string) {
    if (!project || !directory) {
      return { project: null, todos: [], completedTodos: 0, totalTodos: 0 };
    }
    const projectState = getProjectState(directory, project);
    const todoManager = new TodoManagerTool(directory);
    const todos = todoManager.listTodos(project).todos || [];
    
    return {
      project: projectState,
      todos,
      completedTodos: todos.filter(t => t.status === "completed").length,
      totalTodos: todos.length
    };
  }
  private getStaticFallback(): string {
    return `기획 에이전트입니다.\n\n현재 LLM 서비스를 사용할 수 없습니다.\n네트워크 연결을 확인해 주세요.`;
  }
}
index.ts 업데이트:
// src/index.ts (주요 부분만)
import { LLMClientFactory } from "./llm/factory.js";
const ohMyNovelist: Plugin = async (input: PluginInput): Promise<Hooks> => {
  const { directory } = input;
  
  // LLM 클라이언트 초기화
  let llmClient: LLMClient | undefined;
  try {
    llmClient = LLMClientFactory.create();
    console.log("✅ LLM client initialized");
  } catch (error) {
    console.warn("⚠️ LLM client failed:", error);
  }
  
  const agents = {
    director: new DirectorAgent(),
    concept: new ConceptAgent(),
    // ... 나머지 에이전트
  };
  
  return {
    "chat.message": async (input, output) => {
      const content = getTextFromParts(output.parts);
      
      const response = await agents.director.handle(
        content,
        currentProject,
        agents,
        todoManager,
        projectState,
        { llmClient, directory } // LLM 컨텍스트 전달
      );
      
      output.parts.push({
        id: "prt-" + Date.now(),
        sessionID: message.sessionID,
        messageID: message.id,
        type: "text" as const,
        text: response,
      });
    }
  };
};
Director 업데이트:
// src/agents/director.ts
async handle(
  content: string,
  project: string | null,
  agents?: Record<string, BaseAgent>,
  todoManager?: TodoManagerTool,
  projectState?: ProjectState | null,
  llmContext?: { llmClient?: LLMClient; directory?: string }
): Promise<string> {
  // ... 기존 라우팅 로직 ...
  
  const agentKey = this.selectSpecialistAgent(content);
  if (agentKey && agents[agentKey]) {
    const response = await agents[agentKey].handle(
      content,
      project,
      llmContext // LLM 컨텍스트 전달
    );
    return this.wrapDelegatedResponse(agentKey, response, project);
  }
  
  // ...
}
---
Phase 4: 컨텍스트 관리 (2일)
// src/context/manager.ts
import { getProjectState, type ProjectState } from "../utils/state.js";
import { TodoManagerTool, type TodoItem } from "../tools/todo-manager.js";
export interface NovelContext {
  project: ProjectState | null;
  todos: TodoItem[];
  conversation: string[];
  agentMemory: Record<string, unknown>;
}
export class ContextManager {
  private conversationHistory: string[] = [];
  private agentMemories: Map<string, Record<string, unknown>> = new Map();
  constructor(private directory: string) {}
  async build(agentType: string, projectName: string | null): Promise<NovelContext> {
    return {
      project: this.loadProject(projectName),
      todos: this.loadTodos(projectName),
      conversation: this.getRecentConversation(10),
      agentMemory: this.loadAgentMemory(agentType, projectName)
    };
  }
  addToConversation(message: string): void {
    this.conversationHistory.push(message);
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }
  private loadProject(projectName: string | null): ProjectState | null {
    if (!projectName) return null;
    return getProjectState(this.directory, projectName);
  }
  private loadTodos(projectName: string | null): TodoItem[] {
    if (!projectName) return [];
    const todoManager = new TodoManagerTool(this.directory);
    return todoManager.listTodos(projectName).todos || [];
  }
  private getRecentConversation(limit: number): string[] {
    return this.conversationHistory.slice(-limit);
  }
  private loadAgentMemory(agentType: string, projectName: string | null): Record<string, unknown> {
    const key = `${agentType}:${projectName || 'global'}`;
    return this.agentMemories.get(key) || {};
  }
}
---
Phase 5: 나머지 에이전트 (4일)
패턴 적용 (모든 에이전트에 동일):
// src/agents/world-builder.ts (예시)
export class WorldBuilderAgent implements BaseAgent {
  async handle(content, project, context) {
    try {
      const prompt = buildPrompt("world-builder", {...});
      const response = await context?.llmClient?.generate("world-builder", prompt, ctx);
      return response || this.getStaticFallback();
    } catch {
      return this.getStaticFallback();
    }
  }
}
우선순위:
1. WorldBuilderAgent (반일)
2. CharacterAgent (반일)
3. PlotAgent (1일)
4. SceneAgent (1일)
5. DialogueAgent (1일)
---
⚠️ 리스크 및 완화 전략
리스크
OpenCode SDK 미지원
API 비용 초과
컨텍스트 길이 초과
응답 지연
오프라인 사용
---
## ✅ 구현 체크리스트
### Phase 0
- [ ] Anthropic SDK 설치
- [ ] 디렉토리 구조 생성
- [ ] .env.example 작성
### Phase 1
- [ ] `src/llm/types.ts` 작성
- [ ] `src/llm/anthropic-client.ts` 구현
- [ ] `src/llm/factory.ts` 구현
- [ ] OpenCode SDK 지원 확인
### Phase 2
- [ ] `src/prompts/variables.ts` 작성
- [ ] `src/prompts/builder.ts` 구현
- [ ] 프롬프트 변수 치환 테스트
### Phase 3
- [ ] `src/agents/base.ts` 업데이트
- [ ] `src/agents/concept.ts` 리팩토링
- [ ] `src/index.ts` LLM 초기화
- [ ] 수동 테스트 및 디버깅
### Phase 4
- [ ] `src/context/manager.ts` 구현
- [ ] 대화 기록 테스트
- [ ] 컨텍스트 캐싱 확인
### Phase 5
- [ ] WorldBuilderAgent 구현
- [ ] CharacterAgent 구현
- [ ] PlotAgent 구현
- [ ] SceneAgent 구현
- [ ] DialogueAgent 구현
---