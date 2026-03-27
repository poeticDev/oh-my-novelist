# Oh My Novelist - LLM 통합 계획 문서

**버전**: 1.2 (Oracle 검토 + oh-my-openagent 패턴 선별 반영)  
**작성일**: 2026-03-24  
**상태**: 계획 수립 완료, 구현 대기  
**참고**: PLAN1 + PLAN2 + oh-my-openagent 실제 구현 패턴 + 4가지 개선사항 + Oracle 아키텍처 검토

---

## 📋 Executive Summary

### 목표
oh-my-novelist의 9개 에이전트에 LLM 통합을 통해 **정적 응답 → 동적 AI 생성 응답**으로 전환합니다.

### 핵심 설계 원칙
1. **Graceful Degradation**: LLM 실패 시 정적 프롬프트로 폭백
2. **Vendor Agnostic**: 벤더 독립적 모델 식별자 (`anthropic/claude-3-sonnet`)
3. **Fallback Chain**: 우선순위 기반 제공자 폭백
4. **Incremental Rollout**: ConceptAgent MVP → 전체 확장

### 예상 소요 (Oracle 검토 후 조정)
- **총 기간**: 12-14일 (기존 13-15일 → 패턴 적용으로 효율화)
- **MVP 완료**: 6-7일 (ConceptAgent까지)
- **Full Integration**: 12일 (9개 에이전트)
- **아키텍처 강화**: +2일 (Intent Parser, 4단계 Context, Category 모드)

---

## 🏗️ 아키텍처 개요

### 변경 전 (현재)
```
User Input → Director → Agent Selection → Static Prompt File → Return
```

### 변경 후 (목표)
```
User Input → Director → Agent Selection
                    ↓
            Context Building (Canon + Session Summary + Agent Memory + Recent Turns)
                    ↓
            Dynamic Prompt Generation (Template + Variables)
                    ↓
            LLM Resolution → Fallback Chain Traversal
                    ↓
            LLM Call → Streaming Response → Return
                    ↓
            [Failure] Static Prompt Fallback
```

### oh-my-openagent 패턴 적용
```
모델 식별자: "anthropic/claude-3-sonnet-20240229"
              ↓
    Fallback Chain 순회:
    1. anthropic/claude-3-sonnet-20240229
    2. anthropic/claude-3-haiku-20240307
    3. [실패] Static Fallback
              ↓
    각 제공자 SDK 직접 호출
```

---

## 🎯 oh-my-openagent 패턴 선별 채택

**Forking vs Extending 결정**: 기존 oh-my-novelist 코드 확장 선택 (MIT 라이선스 유지, 단순 아키텍처)

### 채택할 패턴 (8가지 중 6가지)

| 패턴 | 채택 여부 | 적용 방식 |
|------|----------|-----------|
| **Orchestration Layer** | ✅ 간소화 | Director가 유일한 orchestrator, 미리 정의된 체인만 |
| **Agent Permission Separation** | ✅ 좁게 | 도구/데이터 경계만, 복잡한 보안 정책 제외 |
| **Planning/Review/Execute** | ⚠️ 선택적 | 큰 작업만 Plan → Draft, 작은 작업은 직접 실행 |
| **Category-Based Model Selection** | ✅ 채택 | 4개 모드: planning, drafting, critique, editing |
| **Intent Classification** | ✅ 강화 | 키워드 → 하이브리드 (명시적 @agent > 패턴 > 질문) |
| **Session/Context Management** | ✅ 강력 채택 | Canon + Rolling summary + Agent notes + Recent turns |
| **Graceful Degradation** | ✅ 실용적 | Full / Reduced / Offline 3단계 |
| **Prompt Engineering** | ✅ 강력 채택 | 공통 scaffold + agent별 제약/출력 형식 |

### 명시적 회피할 복잡성

| oh-my-openagent 기능 | 회피 이유 |
|---------------------|----------|
| LSP/AST-grep 통합 | 코드 작업이 아닌 창작 작업 |
| Code modification agents | 텍스트 편집은 Editor로 충분 |
| IDE/CLI 워크플로우 | OpenCode 플러그인 내 해결 |
| tmux 기반 운영 | 불필요한 인프라 |
| 복잡한 orchestration layer | Director로 충분 |
| Plan/review/execute 강제 | 창작에는 유연성 필요 |
| Skill systems | 9개 에이전트로 충분히 표현 가능 |
| Background task systems | 동기 응답으로 시작 |

### 4단계 컨텍스트 구조 (강력 채택) - 통일된 NovelContext

```typescript
// src/llm/types.ts - 통일된 NovelContext 타입
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
  project: ProjectState | null;  // 기존 project 통합
  todoSummary: TodoSummary | null;  // 기존 todos 요약
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

// 통일된 4단계 NovelContext
export interface NovelContext {
  canon: CanonContext | null;              // 1. Global Canon
  sessionSummary: SessionSummary | null;   // 2. Rolling Summary
  agentMemory: AgentMemory;                // 3. Agent Notes (단수 - 현재 에이전트용)
  recentConversation: ConversationEntry[]; // 4. Recent Turns
}

// 사용 예시:
// const projectName = context.canon?.project?.name ?? "미정";
// const phase = context.canon?.project?.currentPhase ?? "planning";
// const todoProgress = context.canon?.todoSummary
//   ? `${context.canon.todoSummary.completed}/${context.canon.todoSummary.total}`
//   : "0/0";
```

### Category-Based Model 4단계

```typescript
// Category = Generation Parameters only (Model은 Fallback Chain에서 선택)
const CATEGORY_PARAMS: Record<ModelCategory, GenerationParams> = {
  planning: {    // Concept, World, Character, Plot
    temperature: 0.8,
    maxTokens: 4096,
    topP: 0.9
  },
  drafting: {    // Scene, Dialogue
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9
  },
  critique: {    // Critic
    temperature: 0.3,
    maxTokens: 3072,
    topP: 0.5
  },
  editing: {     // Editor
    temperature: 0.2,
    maxTokens: 3072,
    topP: 0.3
  }
};

// Agent → Category 매핑
const AGENT_CATEGORIES: Record<AgentType, ModelCategory> = {
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

// Fallback Chain = Model Candidates only
const DEFAULT_CANDIDATES: ModelCandidate[] = [
  { provider: "anthropic", model: "claude-3-sonnet-20240229" },
  { provider: "anthropic", model: "claude-3-haiku-20240307" }
];

const AGENT_FALLBACK_CHAINS: Record<AgentType, ModelCandidate[]> = {
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

// Runtime Resolution: Category params + Fallback candidates 결합
function resolveGenerationConfig(agentType: AgentType) {
  const category = AGENT_CATEGORIES[agentType];
  return {
    category,
    params: CATEGORY_PARAMS[category],
    candidates: AGENT_FALLBACK_CHAINS[agentType]
  };
}
// 사용 예시:
// const { params, candidates } = resolveGenerationConfig("editor");
// // params: { temperature: 0.2, maxTokens: 3072 }
// // candidates: [{ provider: "anthropic", model: "claude-3-sonnet" }, ...]
```

### Prompt Engineering 공통 Scaffold

```typescript
// src/prompts/types.ts

export interface PromptScaffold {
  role: string;              // "당신은 웹소설 기획 전문가입니다"
  objective: string;         // "로그라인 3개를 생성하세요"
  contextSections: string[]; // ["프로젝트: 나의 판타지", "단계: planning", ...]
  constraints: string[];     // ["3개의 서로 다른 로그라인", "hook 포함"]
  outputFormat: string;      // "1. ...\n2. ...\n3. ..."
  tone?: string;             // optional: "창의적이면서도 구체적으로"
}

export interface PromptVariables {
  userRequest: string;       // 사용자의 원본 요청
}

// Builder 출력 타입
export interface BuiltPrompt {
  system: string;  // scaffold + agent instructions 조합
  user: string;    // variables.userRequest
}
```

---

## 📁 파일 구조

### 새 파일
```
src/
├── llm/
│   ├── types.ts              # LLM 인터페이스 및 타입 정의
│   ├── client.ts             # LLMClient 인터페이스
│   ├── anthropic-client.ts   # Anthropic SDK 구현 (우선)
│   ├── opencode-client.ts    # OpenCode SDK 구현 (향후)
│   ├── factory.ts            # 클라이언트 팩토리 + Fallback Chain
│   └── chains.ts             # 에이전트별 Fallback Chain 정의
├── prompts/
│   ├── types.ts              # 프롬프트 변수 타입
│   ├── loader.ts             # 프롬프트 파일 로더
│   ├── builder.ts            # 동적 프롬프트 빌더
│   └── variables.ts          # 변수 정의 및 포맷터
├── context/
│   └── manager.ts            # 컨텍스트 관리 (Project + Todos + Conversation)
└── agents/
    ├── base.ts               # LLM 주입 인터페이스 (수정)
    ├── concept.ts            # LLM 통합 예시 (수정)
    └── [others].ts           # 동일 패턴 적용
```

### 수정 파일
```
src/
├── index.ts                  # LLM 클라이언트 초기화
└── agents/
    ├── director.ts           # LLM 컨텍스트 전달
    └── base.ts               # 인터페이스 업데이트
```

---

## 🔧 Phase 상세 설계

### Phase 0: 환경 준비 (0.5일)

**작업:**
1. Anthropic SDK 설치: `npm install @anthropic-ai/sdk`
2. 디렉토리 생성: `mkdir -p src/llm src/prompts src/context`
3. 환경 변수 파일 생성

**.env.example:**
```bash
# Anthropic (필수)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (선택)
OPENAI_API_KEY=sk-...

# OpenCode (향후 확장)
# OPENCODE_API_KEY=...
```

---

### Phase 1: LLM 클라이언트 (2일)

#### 1.1 타입 정의 (`src/llm/types.ts`)

```typescript
// oh-my-openagent 패턴: 벤더 독립적 모델 식별자
export type ModelId = string; // "anthropic/claude-3-sonnet-20240229"

export interface LLMClient {
  readonly provider: string;
  readonly defaultModel: string;
  
  generate(
    modelId: string,
    prompt: string,
    context: NovelContext
  ): Promise<LLMResponse>;
  
  stream?(
    modelId: string,
    prompt: string,
    context: NovelContext
  ): AsyncIterable<string>;
  
  isAvailable(): boolean;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  error?: string;
}

// Category & Fallback Chain 타입 (분리된 책임)
export type ModelCategory = "planning" | "drafting" | "critique" | "editing";

// Category = Generation Parameters only
export interface GenerationParams {
  temperature: number;
  maxTokens: number;
  topP?: number;
}

// Fallback Chain = Model Candidates only
export interface ModelCandidate {
  provider: "anthropic";
  model: string;
}

// Runtime에 결합된 설정
export interface ResolvedGenerationConfig {
  category: ModelCategory;
  params: GenerationParams;
  candidates: ModelCandidate[];
}
```

#### 1.2 Anthropic 클라이언트 구현 (`src/llm/anthropic-client.ts`)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { LLMClient, LLMResponse, GenerationParams } from "./types.js";

export class AnthropicLLMClient implements LLMClient {
  readonly provider = "anthropic";
  readonly defaultModel = "claude-3-sonnet-20240229";
  
  private client: Anthropic | null = null;
  
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }
  
  isAvailable(): boolean {
    return this.client !== null;
  }
  
  async generate(
    modelId: string,
    prompt: string,
    params: GenerationParams
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error("Anthropic client not initialized");
    }

    // 모델 ID에서 제공자 접두사 제거
    const model = modelId.replace("anthropic/", "");

    try {
      // PromptBuilder에서 이미 구성된 프롬프트를 그대로 전송
      // (system prompt는 이미 prompt 문자열에 포함됨)
      const response = await this.client.messages.create({
        model: model || this.defaultModel,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        top_p: params.topP,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0]?.text || "";

      return {
        content,
        usage: {
          promptTokens: response.usage?.input_tokens || 0,
          completionTokens: response.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      return {
        content: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
```

#### 1.3 Fallback Chain 정의 (`src/llm/chains.ts`)

```typescript
import type { AgentFallbackChains } from "./types.js";

// oh-my-openagent 패턴: 에이전트별 Fallback Chain
export const AGENT_FALLBACK_CHAINS: AgentFallbackChains = {
  // 높은 품질이 필요한 에이전트
  director: [
    { providers: ["anthropic"], model: "claude-3-opus-20240229" },
    { providers: ["anthropic"], model: "claude-3-sonnet-20240229" },
  ],
  concept: [
    { providers: ["anthropic"], model: "claude-3-sonnet-20240229" },
    { providers: ["anthropic"], model: "claude-3-haiku-20240307" },
  ],
  character: [
    { providers: ["anthropic"], model: "claude-3-sonnet-20240229" },
    { providers: ["anthropic"], model: "claude-3-haiku-20240307" },
  ],
  
  // 중간 품질
  worldBuilder: [
    { providers: ["anthropic"], model: "claude-3-sonnet-20240229" },
    { providers: ["anthropic"], model: "claude-3-haiku-20240307" },
  ],
  plot: [
    { providers: ["anthropic"], model: "claude-3-sonnet-20240229" },
    { providers: ["anthropic"], model: "claude-3-haiku-20240307" },
  ],
  critic: [
    { providers: ["anthropic"], model: "claude-3-sonnet-20240229" },
    { providers: ["anthropic"], model: "claude-3-haiku-20240307" },
  ],
  
  // 기본 품질
  scene: [
    { providers: ["anthropic"], model: "claude-3-haiku-20240307" },
    { providers: ["anthropic"], model: "claude-3-sonnet-20240229" },
  ],
  dialogue: [
    { providers: ["anthropic"], model: "claude-3-haiku-20240307" },
    { providers: ["anthropic"], model: "claude-3-sonnet-20240229" },
  ],
  editor: [
    { providers: ["anthropic"], model: "claude-3-haiku-20240307" },
    { providers: ["anthropic"], model: "claude-3-sonnet-20240229" },
  ],
};
```

#### 1.4 팩토리 구현 (`src/llm/factory.ts`)

```typescript
import type { LLMClient, FallbackEntry } from "./types.js";
import { AnthropicLLMClient } from "./anthropic-client.js";
import { AGENT_FALLBACK_CHAINS } from "./chains.js";

// 제공자 클라이언트 레지스트리
const providerClients: Map<string, () => LLMClient> = new Map([
  ["anthropic", () => new AnthropicLLMClient()],
  // 향후: ["openai", () => new OpenAILLMClient()],
  // 향후: ["opencode", () => new OpenCodeLLMClient()],
]);

// Provider Client Interface
interface ProviderClient {
  generate(input: { modelId: string; prompt: string; params: GenerationParams }): Promise<LLMResponse>;
  isAvailable(): boolean;
}

// Runtime Fallback을 수행하는 Resilient Client
export class ResilientLLMClient {
  private providers: Map<string, ProviderClient> = new Map();
  
  constructor() {
    // Initialize providers
    const anthropic = new AnthropicLLMClient();
    if (anthropic.isAvailable()) {
      this.providers.set("anthropic", anthropic);
    }
  }
  
  /**
   * Runtime Fallback Chain 수행
   * 1. 첫 번째 후보로 시도 (degradation: "full")
   * 2. 실패 시 다음 후보로 시도 (degradation: "reduced")
   * 3. 모두 실패 시 offline 모드 반환
   */
  async generate(
    agentType: AgentType,
    prompt: string,
    context: NovelContext
  ): Promise<LLMResponse> {
    const { params, candidates } = resolveGenerationConfig(agentType);
    let lastError: Error | undefined;
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const provider = this.providers.get(candidate.provider);
      
      if (!provider?.isAvailable()) continue;
      
      const modelId = `${candidate.provider}/${candidate.model}`;
      
      try {
        const result = await provider.generate({
          modelId,
          prompt,
          params
        });
        
        return {
          ...result,
          modelId,
          degradation: i === 0 ? "full" : "reduced"
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`LLM failed for ${modelId}; trying next fallback`, lastError.message);
      }
    }
    
    // 모든 후보 실패 시 offline 모드
    return {
      content: "",
      modelId: undefined,
      degradation: "offline",
      error: lastError?.message ?? "No LLM provider available"
    };
  }
}

// Factory
export class LLMClientFactory {
  static createResilientClient(): ResilientLLMClient {
    return new ResilientLLMClient();
  }
}
```

---

### Phase 2: 프롬프트 빌더 (1.5일)

#### 2.1 변수 타입 (`src/prompts/types.ts`)

```typescript
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
```

#### 2.2 빌더 구현 (`src/prompts/builder.ts`)

```typescript
import type { PromptScaffold, PromptVariables, BuiltPrompt } from "./types.js";
import { PromptLoader } from "./loader.js";

export class PromptBuilder {
  constructor(private readonly loader: PromptLoader) {}

  /**
   * Scaffold + Agent Instructions + Variables → BuiltPrompt
   */
  build(
    agentType: string,
    scaffold: PromptScaffold,
    variables: PromptVariables
  ): BuiltPrompt {
    // 1. Loader에서 agent instruction 파일 로드 (캐싱됨)
    const agentInstructions = this.loader.load(agentType);

    // 2. Scaffold 섹션 구성
    const sections: string[] = [
      `# Role\n${scaffold.role}`,
      `# Objective\n${scaffold.objective}`,
      `# Context\n${scaffold.contextSections.join("\n")}`,
      `# Constraints\n${scaffold.constraints.map((c) => `- ${c}`).join("\n")}`,
      `# Output Format\n${scaffold.outputFormat}`,
    ];

    if (scaffold.tone) {
      sections.push(`# Tone\n${scaffold.tone}`);
    }

    sections.push(`# Agent Instructions\n${agentInstructions}`);

    return {
      system: sections.join("\n\n"),
      user: variables.userRequest,
    };
  }
}

export function formatTodoProgress(completed: number, total: number): string {
  if (total === 0) return "0/0";
  const percentage = Math.round((completed / total) * 100);
  return `${completed}/${total} (${percentage}%)`;
}
```

#### 2.3 로더 구현 (`src/prompts/loader.ts`)

**책임**: 파일 읽기/캐싱만 수행 (포맷팅 없음)

```typescript
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const PROMPT_CACHE: Map<string, string> = new Map();

export class PromptLoader {
  /**
   * Agent instruction 파일 로드 (캐싱됨)
   * Builder에서만 호출됨
   */
  load(agentType: string): string {
    if (PROMPT_CACHE.has(agentType)) {
      return PROMPT_CACHE.get(agentType)!;
    }

    const promptPath = join(
      process.cwd(),
      "src",
      "agents",
      "prompts",
      `${agentType}.md`
    );

    if (!existsSync(promptPath)) {
      // 파일 없으면 기본 instruction 반환
      const defaultContent = `당신은 ${agentType} 전문가입니다. 사용자 요청에 따라 창작적인 결과를 제공하세요.`;
      PROMPT_CACHE.set(agentType, defaultContent);
      return defaultContent;
    }

    const content = readFileSync(promptPath, "utf-8");
    PROMPT_CACHE.set(agentType, content);
    return content;
  }

  clearCache(): void {
    PROMPT_CACHE.clear();
  }
}
```

---

### Phase 3: 컨텍스트 관리 (2일)

#### 3.1 컨텍스트 매니저 (`src/context/manager.ts`)

**개선사항**: 상세한 대화 기록 관리 (role, agentType, timestamp 포함)

```typescript
import { getProjectState, type ProjectState } from "../utils/state.js";
import { TodoManagerTool, type TodoItem } from "../tools/todo-manager.js";
import type { NovelContext } from "../llm/types.js";

/**
 * 대화 기록 엔트리 타입
 */
interface ConversationEntry {
  role: "user" | "assistant";
  agentType?: string;  // 어떤 에이전트가 응답했는지
  content: string;
  timestamp: Date;
}

export class ContextManager {
  // Plugin-scoped: 프로젝트별 conversation history (Phase 1: 메모리, Phase 2: 파일)
  private conversationHistoryByProject = new Map<string, ConversationEntry[]>();
  
  // Plugin-scoped: 프로젝트별 session summary (Phase 1: 메모리, Phase 2: 파일)
  private sessionSummariesByProject = new Map<string, SessionSummary>();
  
  // Plugin-scoped: (agentType:project)별 메모리 (Phase 1: 메모리, Phase 2: 파일)
  private agentMemories = new Map<string, AgentMemory>();
  
  private readonly maxHistory = 20;  // 최대 20개 저장
  private readonly maxContentLength = 1000;  // 각 메시지 최대 1000자
  
  constructor(private directory: string) {}
  
  /**
   * 에이전트 실행을 위한 컨텍스트 구성 (4단계 모델)
   */
  async build(
    agentType: AgentType,
    projectName: string | null
  ): Promise<NovelContext> {
    const key = projectName ?? "__global__";
    
    return {
      canon: await this.loadCanon(projectName),           // 1. Global Canon
      sessionSummary: this.sessionSummariesByProject.get(key) ?? null,  // 2. Session Summary
      agentMemory: this.getAgentMemory(agentType, projectName),  // 3. Agent Memory (단수)
      recentConversation: this.getRecentConversation(projectName, 10)  // 4. Recent Turns
    };
  }
  
  /**
   * 사용자 입력 기록 (chat.message handler에서 호출)
   */
  recordUserTurn(projectName: string | null, content: string): void {
    this.appendConversation(projectName, {
      role: "user",
      content: content.slice(0, this.maxContentLength),
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 에이전트 응답 기록 (chat.message handler에서 호출)
   */
  recordAgentTurn(
    projectName: string | null,
    agentType: AgentType,
    content: string
  ): void {
    this.appendConversation(projectName, {
      role: "assistant",
      agentType,
      content: content.slice(0, this.maxContentLength),
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 대화 기록 추가 (낮은 수준)
   */
  private appendConversation(
    projectName: string | null,
    entry: ConversationEntry
  ): void {
    const key = projectName ?? "__global__";
    const history = this.conversationHistoryByProject.get(key) ?? [];
    
    history.push(entry);
    
    // 최대 개수 유지 (오래된 것 제거)
    if (history.length > this.maxHistory) {
      history.shift();
    }
    
    this.conversationHistoryByProject.set(key, history);
  }
  
  /**
   * 최근 대화 기록 조회
   */
  getRecentConversation(projectName: string | null, limit: number): ConversationEntry[] {
    const key = projectName ?? "__global__";
    const history = this.conversationHistoryByProject.get(key) ?? [];
    return history.slice(-limit);
  }
  
  /**
   * 에이전트 메모리 조회 (단수 - 현재 에이전트용)
   */
  getAgentMemory(agentType: AgentType, projectName: string | null): AgentMemory {
    const key = `${agentType}:${projectName ?? "__global__"}`;
    return this.agentMemories.get(key) ?? {
      agentType,
      notes: [],
      lastArtifacts: []
    };
  }
  
  /**
   * 에이전트 메모리 업데이트
   */
  updateAgentMemory(
    agentType: AgentType,
    projectName: string | null,
    data: Partial<AgentMemory>
  ): void {
    const key = `${agentType}:${projectName ?? "__global__"}`;
    const existing = this.getAgentMemory(agentType, projectName);
    this.agentMemories.set(key, { 
      ...existing, 
      ...data,
      updatedAt: new Date().toISOString()
    });
    
    // Phase 2: 여기에 파일 저장 로직 추가
    // this.saveAgentMemoryToFile(agentType, projectName, this.agentMemories.get(key)!);
  }
  
  /**
   * Canon 로드 (project + todoSummary + world building 정보)
   * Phase 1: 기존 state.json + todos에서 구성
   * Phase 2: .oh-my-novelist/canon/{project}.json에서 로드
   */
  private async loadCanon(projectName: string | null): Promise<CanonContext | null> {
    if (!projectName) return null;
    
    // Phase 1: 기존 인프라에서 구성
    const project = getProjectState(this.directory, projectName);
    if (!project) return null;
    
    const todoManager = new TodoManagerTool(this.directory);
    const todos = todoManager.listTodos(projectName).todos || [];
    
    return {
      project,
      todoSummary: {
        total: todos.length,
        completed: todos.filter(t => t.status === "completed").length,
        inProgress: todos.filter(t => t.status === "in_progress").length,
        pending: todos.filter(t => t.status === "pending").length
      },
      worldRules: [],  // Phase 2: canon 파일에서 로드
      cast: [],        // Phase 2: canon 파일에서 로드
      timeline: []     // Phase 2: canon 파일에서 로드
    };
    
    // Phase 2: Canon 파일에서 로드
    // return this.loadCanonFromFile(projectName);
  }
}
```

#### 3.2 Conversation Context 사용 계획

**사용 시나리오**:

**시나리오 1 - 맥락 유지**
```
사용자: "@concept 현대 판타지 아이디어"
→ ConceptAgent: "현대 판타지 설정으로는..."
사용자: "그 세계관에 마법 시스템을 추가하고 싶어"
→ ConceptAgent는 이전 대화를 보고 "현대 판타지" 맥락 유지
```

**시나리오 2 - 에이전트 간 컨텍스트 전달**
```
사용자: "@concept 현대 판타지 아이디어"
→ ConceptAgent가 로그라인 생성
사용자: "@world 이 세계관의 마법 시스템 설계해줘"
→ WorldBuilderAgent가 ConceptAgent의 설정을 참조
```

---

### Phase 4: ConceptAgent MVP (3일)

#### 4.1 BaseAgent 인터페이스 업데이트 (`src/agents/base.ts`)

```typescript
import type { LLMClient } from "../llm/types.js";
import type { ContextManager } from "../context/manager.js";

export interface AgentContext {
  directory: string;
  contextManager: ContextManager;  // plugin-scoped (Phase 1: 메모리만, Phase 2: 영속성)
  llmClient: LLMClient;
}

export interface BaseAgent {
  readonly name: string;
  readonly description: string;
  
  handle(
    content: string,
    project: string | null,
    context: AgentContext
  ): Promise<string>;
}
```

#### 4.2 ConceptAgent 구현 (`src/agents/concept.ts`)

**⚠️ 개선사항**: ContextManager를 사용하여 중복 제거

```typescript
import type { BaseAgent, AgentContext } from "./base.js";
import { PromptBuilder, formatTodoProgress } from "../prompts/builder.js";
import { PromptLoader } from "../prompts/loader.js";
import type { PromptScaffold } from "../prompts/types.js";

export class ConceptAgent implements BaseAgent {
  readonly name = "Concept";
  readonly description = "웹소설 기획 전문가";
  private promptBuilder: PromptBuilder;

  constructor() {
    // Agent 생성 시 PromptBuilder 초기화 (Loader 캐싱 활용)
    this.promptBuilder = new PromptBuilder(new PromptLoader());
  }

  async handle(
    content: string,
    project: string | null,
    context: AgentContext
  ): Promise<string> {
    try {
      // 1. plugin-scoped ContextManager에서 4단계 컨텍스트 조회
      const novelContext = await context.contextManager.build(this.name, project);

      // 2. Scaffold 구성 (Agent별로 정의)
      const scaffold: PromptScaffold = {
        role: "당신은 웹소설 기획 전문가입니다",
        objective: "사용자의 요청에 따라 창작적인 기획을 제공하세요",
        contextSections: [
          `프로젝트: ${novelContext.canon?.project?.name || project || "미정"}`,
          `단계: ${novelContext.canon?.project?.currentPhase || "planning"}`,
          `진행: ${formatTodoProgress(
            novelContext.canon?.todoSummary?.completed ?? 0,
            novelContext.canon?.todoSummary?.total ?? 0
          )}`,
          novelContext.recentConversation.length > 0
            ? `최근 대화:\n${novelContext.recentConversation
                .map((e) => `${e.role}${e.agentType ? `(${e.agentType})` : ""}: ${e.content}`)
                .join("\n")}`
            : "",
        ].filter(Boolean),
        constraints: [
          "3개의 서로 다른 로그라인을 제공하세요",
          "각 로그라인에는 명확한 hook이 포함되어야 합니다",
          "타겟 독자층을 고려한 어필 포인트를 제시하세요",
        ],
        outputFormat: "1. [로그라인 1]\n   - Hook: ...\n   - 타겟: ...\n\n2. [로그라인 2]...",
        tone: "창의적이면서도 구체적으로, 전문적인 기획자의 어조로",
      };

      // 3. PromptBuilder로 최종 프롬프트 생성 (Loader → Builder)
      const prompt = this.promptBuilder.build(this.name, scaffold, {
        userRequest: content,
      });

      // 4. LLM 호출 (Resilient Client - runtime fallback 자동 수행)
      const response = await context.llmClient.generate(
        this.name as AgentType,
        prompt.system + "\n\n" + prompt.user,  // BuiltPrompt 조합
        novelContext
      );
      
      // 4. Degradation 처리
      switch (response.degradation) {
        case "full":
        case "reduced":
          // 정상 응답
          return response.content;
          
        case "offline":
          // 모든 후보 실패 - static fallback
          console.warn("LLM offline, using static fallback:", response.error);
          return this.getStaticFallback();
          
        default:
          return this.getStaticFallback();
      }
  }
  
  /**
   * 대화 기록 포맷팅
   */
  private formatConversation(conversation: string[]): string {
    if (conversation.length === 0) return "";
    return "이전 대:\n" + conversation.join("\n");
  }
  
  private getStaticFallback(): string {
    return `**기획 에이전트 (오프라인 모드)**\n\n현재 LLM 서비스를 사용할 수 없습니다. 다음을 확인해 주세요:\n\n1. ANTHROPIC_API_KEY 환경 변수가 설정되어 있는지 확인\n2. 네트워크 연결 상태 확인\n\n기본 기능만 제공됩니다.`;
  }
}
```

#### 4.3 index.ts LLM 초기화 (`src/index.ts`)

**⚠️ 개선사항**: 각 에이전트별로 독립적인 LLM 설정을 Map으로 관리

```typescript
import { LLMClientFactory } from "./llm/factory.js";
import type { LLMClient } from "./llm/types.js";

// 에이전트별 LLM 설정 타입
interface AgentLLMConfig {
  client: LLMClient;
  modelId: string;
}

const ohMyNovelist: Plugin = async (input: PluginInput): Promise<Hooks> => {
  const { directory } = input;
  
  // Plugin-scoped ContextManager (Phase 1: 메모리 기반, Phase 2: 파일 영속성)
  const contextManager = new ContextManager(directory);
  
  // Resilient LLM Client (runtime fallback 포함)
  const llmClient = LLMClientFactory.createResilientClient();
  
  const agents = {
    director: new DirectorAgent(),
    concept: new ConceptAgent(),
    worldBuilder: new WorldBuilderAgent(),
    character: new CharacterAgent(),
    plot: new PlotAgent(),
    scene: new SceneAgent(),
    dialogue: new DialogueAgent(),
    critic: new CriticAgent(),
    editor: new EditorAgent(),
  };
  
  return {
    "chat.message": async (input, output) => {
      const content = getTextFromParts(output.parts);
      
      // 사용자 입력을 conversation history에 기록
      contextManager.recordUserTurn(currentProject, content);
      
      // AgentContext에 plugin-scoped 컴포넌트 전달
      const response = await agents.director.handle(
        content,
        currentProject,
        agents,
        todoManager,
        projectState,
        { 
          directory,
          contextManager,  // plugin-scoped
          llmClient        // resilient client with runtime fallback
        }
      );
      
      // Assistant 응답을 conversation history에 기록
      contextManager.recordAgentTurn(currentProject, "director", response);
      
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
```

#### 4.4 Director 업데이트 (`src/agents/director.ts`)

**⚠️ 개선사항**: Map에서 해당 에이전트의 LLM 설정을 조회하여 전달

```typescript
import type { BaseAgent, AgentContext } from "./base.js";

async handle(
  content: string,
  project: string | null,
  agents: Record<string, BaseAgent>,
  todoManager: TodoManagerTool,
  projectState: ProjectState | null,
  context: AgentContext  // plugin-scoped contextManager와 llmClient 포함
): Promise<string> {
  // ... 기존 라우팅 로직 ...
  
  const agentKey = this.selectSpecialistAgent(content);
  if (agentKey && agents[agentKey]) {
    // AgentContext를 그대로 하위 에이전트에 전달
    // (contextManager와 llmClient는 이미 plugin-scoped로 공유됨)
    const response = await agents[agentKey].handle(
      content,
      project,
      context  // directory, contextManager, llmClient 포함
    );
    
    return this.wrapDelegatedResponse(agentKey, response, project);
  }
  
  // ...
}
```

#### 4.5 Director Multi-Agent Chain 명세

**지원 체인** (Phase 4-5에서 구현):

```typescript
// src/agents/director-chains.ts

export interface ChainStage {
  agent: AgentType;
  inputTransform: (previousOutput: string) => string;
}

export interface DirectorChain {
  id: "bootstrap" | "scenePolish";
  trigger: {
    keywords: string[];
    minProjectPhase?: string;
  };
  stages: ChainStage[];
  execution: "sync-serial";  // MVP: 동기 순차 실행
}

export const DIRECTOR_CHAINS: DirectorChain[] = [
  {
    id: "bootstrap",
    trigger: {
      keywords: ["처음부터 설정", "기획부터 캐릭터까지", "한 번에 세계관"],
      minProjectPhase: "planning"
    },
    stages: [
      { agent: "concept", inputTransform: (input) => input },
      { agent: "worldBuilder", inputTransform: (conceptOutput) => 
        `Concept: ${conceptOutput}\n\n이 컨셉을 바탕으로 세계관을 설계하세요.` },
      { agent: "character", inputTransform: (worldOutput) =>
        `World: ${worldOutput}\n\n이 세계관에 등장할 주인공을 설계하세요.` }
    ],
    execution: "sync-serial"
  },
  {
    id: "scenePolish",
    trigger: {
      keywords: ["장면 써주고 검토", "초안 후 다듬기", "scene polish"],
      minProjectPhase: "writing"
    },
    stages: [
      { agent: "scene", inputTransform: (input) => input },
      { agent: "critic", inputTransform: (sceneOutput) =>
        `Scene Draft:\n${sceneOutput}\n\n검토하고 문제점을 지적하세요.` },
      { agent: "editor", inputTransform: (criticOutput) =>
        `Critic Feedback:\n${criticOutput}\n\n피드백을 반영하여 다듬으세요.` }
    ],
    execution: "sync-serial"
  }
];

// Chain 실행기
export async function executeChain(
  chain: DirectorChain,
  initialInput: string,
  project: string | null,
  agents: Record<string, BaseAgent>,
  context: AgentContext
): Promise<string> {
  const results: { stage: string; output: string }[] = [];
  let currentInput = initialInput;
  
  for (const stage of chain.stages) {
    const agent = agents[stage.agent];
    if (!agent) {
      throw new Error(`Agent not found: ${stage.agent}`);
    }
    
    // 사용자에게 진행 상황 알림 (선택적)
    console.log(`[Chain] Running ${stage.agent}...`);
    
    const output = await agent.handle(currentInput, project, context);
    results.push({ stage: stage.agent, output });
    
    // 다음 단계 입력 변환
    currentInput = stage.inputTransform(output);
  }
  
  // 최종 결과 조합
  return results.map(r => `## ${r.stage}\n${r.output}`).join("\n\n");
}
```

**사용 예시**:
```
사용자: "처음부터 기획부터 캐릭터까지 한 번에 해줘"
Director: trigger 확인 → bootstrap 체인 실행
  → Concept: 로그라인 3개
  → WorldBuilder: 세계관 설정
  → Character: 주인공 프로필
  → 최종 결과: 3단계 출력을 조합하여 반환
```

---

### Phase 5: 나머지 에이전트 (4일)

모든 에이전트에 동일한 패턴 적용:

```typescript
// src/agents/world-builder.ts (예시)
export class WorldBuilderAgent implements BaseAgent {
  async handle(content, project, context) {
    try {
      const prompt = buildPrompt("world-builder", {
        projectName: project || "미정",
        // ...
      });
      
      if (!context?.llmClient || !context?.modelId) {
        return this.getStaticFallback();
      }
      
      const response = await context.llmClient.generate(
        context.modelId,
        prompt,
        ctx
      );
      
      return response.content || this.getStaticFallback();
    } catch {
      return this.getStaticFallback();
    }
  }
  
  private getStaticFallback(): string {
    return "세계관 에이전트 (오프라인 모드)";
  }
}
```

**우선순위:**
1. WorldBuilderAgent (반일)
2. CharacterAgent (반일)
3. PlotAgent (1일)
4. SceneAgent (1일)
5. DialogueAgent (1일)
6. CriticAgent (반일)
7. EditorAgent (반일)

---

## ⚠️ 리스크 및 완화 전략

| 리스크 | 영향도 | 완화 전략 |
|--------|--------|-----------|
| **Anthropic API 비용 초과** | 중간 | • 사용량 모니터링 로깅<br>• 토큰 사용량 추적<br>• Haiku 모델로 자동 다운그레이드 |
| **API Rate Limiting** | 중간 | • Exponential backoff 적용<br>• 요청 큐잉<br>• Fallback Chain 순회 |
| **컨텍스트 길이 초과** | 중간 | • 동적 트렁케이션<br>• 중요 정보 우선순위<br>• 요약 로직 |
| **응답 지연** | 중간 | • 타임아웃 설정 (30초)<br>• 스트리밍 응답 고려 (Phase 2)<br>• 로딩 인디케이터 |
| **오프라인 사용** | 낮음 | • 정적 폭백 유지<br>• 오프라인 모드 명시 |
| **API 키 누출** | 높음 | • 환경 변수만 사용<br>• 코드에 키 하드코딩 금지<br>• .env.example 제공 |

---

## 📅 통합 타임라인 (Phase 0-5)

| Phase | 기간 | 작업 | 산출물 |
|-------|------|------|--------|
| **0** | 0.5일 | 환경 준비 | Anthropic SDK, 디렉토리 구조, .env 설정 |
| **1** | 2일 | **코어 계약** | NovelContext(4단계), ContextManager(Plugin-scoped), Category/Fallback 분리 |
| **2** | 1일 | **Prompt 파이프라인** | Loader → Builder → Client 분리, PromptScaffold |
| **3** | 2.5일 | **LLM Runtime** | Resilient Client, Runtime Fallback, Graceful Degradation |
| **4** | 3일 | **MVP** | Director + Concept + Scene |
| **5** | 3일 | **전체 롤아웃** | 나머지 6 에이전트 + 안정화 |

**총 예상 소요:** 12-14일
**주요 변경:** Oracle 패턴 적용으로 아키텍처 강화, 명확한 책임 분리

---

## ✅ 구현 체크리스트 (통합 Phase 0-5)

### Phase 0: 환경 준비 (0.5일)
- [ ] `npm install @anthropic-ai/sdk`
- [ ] `mkdir -p src/llm src/prompts src/context`
- [ ] `.env.example` 작성 및 `.env` 설정

### Phase 1: Core Contracts (2일)
- [ ] **NovelContext 4단계 모델 구현**
  - [ ] canon: CanonContext (project + todoSummary + worldRules + cast + timeline)
  - [ ] sessionSummary: SessionSummary
  - [ ] agentMemory: AgentMemory (단수 - 현재 에이전트용)
  - [ ] recentConversation: ConversationEntry[]
- [ ] **Plugin-scoped ContextManager**
  - [ ] conversationHistoryByProject (Map)
  - [ ] sessionSummariesByProject (Map)
  - [ ] agentMemories (Map)
  - [ ] recordUserTurn(), recordAgentTurn()
  - [ ] Canon 로드 (Phase 1: 기존 인프라, Phase 2: 파일)
- [ ] **Category/Fallback 분리**
  - [ ] CATEGORY_PARAMS: Record<ModelCategory, GenerationParams>
  - [ ] AGENT_CATEGORIES: Record<AgentType, ModelCategory>
  - [ ] AGENT_FALLBACK_CHAINS: Record<AgentType, ModelCandidate[]>
  - [ ] resolveGenerationConfig() 함수

### Phase 2: Prompt Pipeline (1일)
- [ ] **PromptLoader**: 파일 읽기/캐싱만
- [ ] **PromptBuilder**: Scaffold + Agent Instructions + Variables → BuiltPrompt
  - [ ] PromptScaffold 인터페이스
  - [ ] build() 메서드
- [ ] **Type 정의**
  - [ ] BuiltPrompt { system, user }
  - [ ] PromptVariables { userRequest }

### Phase 3: LLM Runtime (2.5일)
- [ ] **AnthropicLLMClient**: ProviderClient 구현
  - [ ] generate(modelId, prompt, params)
  - [ ] isAvailable()
- [ ] **ResilientLLMClient**: Runtime Fallback 수행
  - [ ] generate(agentType, prompt, context)
  - [ ] Fallback Chain 순회
  - [ ] Degradation: "full" → "reduced" → "offline"
- [ ] **LLMClientFactory**: createResilientClient()
- [ ] **Agent 연동**: degradation 결과 처리

### Phase 4: MVP (3일)
- [ ] **Director**: Chain-aware routing
- [ ] **ConceptAgent**: 4단계 Context 사용, PromptScaffold 예시
- [ ] **SceneAgent**: category drafting

### Phase 5: Full Rollout (3일)
- [ ] World, Character, Plot (category: planning)
- [ ] Dialogue (category: drafting)
- [ ] Critic (category: critique)
- [ ] Editor (category: editing)
- [ ] 통합 테스트 및 안정화

---

## 🔮 향후 확장 (Phase 2)

### 추가 제공자 지원
```typescript
// src/llm/openai-client.ts
export class OpenAILLMClient implements LLMClient {
  readonly provider = "openai";
  readonly defaultModel = "gpt-4";
  // ...
}

// src/llm/opencode-client.ts
export class OpenCodeLLMClient implements LLMClient {
  readonly provider = "opencode";
  readonly defaultModel = "kimi-k2.5";
  // ...
}
```

### 스트리밍 응답
```typescript
// Phase 2에서 고려
async *stream(
  modelId: string,
  prompt: string,
  context: NovelContext
): AsyncIterable<string> {
  // 스트리밍 구현
}
```

### 캐싱 및 최적화
- 프롬프트 템플릿 캐싱
- 응답 캐싱 (동일 요청)
- 컨텍스트 압축

---

## 📋 개선사항 상세 설명

### 1. Agent별 LLM 설정 관리 (Map 사용)

**문제**: 기존 설계에서 마지막 에이전트로 덮어쓰는 버그

**해결**: `Map<string, AgentLLMConfig>`로 각 에이전트별 독립적 설정 관리

```typescript
// index.ts
const agentLLMConfigs: Map<string, AgentLLMConfig> = new Map();
for (const agentType of agentTypes) {
  const resolved = LLMClientFactory.create(agentType);
  if (resolved) {
    agentLLMConfigs.set(agentType, resolved);
  }
}

// Director에서 해당 에이전트 설정 조회
const llmConfig = context?.agentLLMConfigs?.get(agentKey);
```

### 2. ContextManager 통합

**문제**: 각 에이전트가 중복으로 Context 구성

**해결**: ContextManager로 통일, 에이전트에서는 호출만

```typescript
// ConceptAgent
const ctxManager = new ContextManager(context?.directory || "");
const novelContext = await ctxManager.build(this.name, project);
```

### 3. Prompt Builder 확장 계획

**Phase 1 (현재)**: 단순 변수 치환
```typescript
result = result.replace(/{{projectName}}/g, variables.projectName);
```

**Phase 2 (향후)**: Handlebars-like 문법
```typescript
// 조걶 블록
{{#if todos}}
진행 상황: {{todoProgress}}
{{/if}}

// 반복문
{{#each todos}}
- {{this.title}} ({{this.status}})
{{/each}}

// unless (역조건)
{{#unless project}}
⚠️ 프로젝트가 생성되지 않았습니다
{{/unless}}
```

### 4. Conversation Context 상세 설계

**대화 엔트리 구조**:
```typescript
interface ConversationEntry {
  role: "user" | "assistant";
  agentType?: string;      // 어떤 에이전트가 응답했는지
  content: string;         // 메시지 내용 (1000자 제한)
  timestamp: Date;
}
```

**사용 시나리오**:

**시나리오 1 - 맥락 유지**
```
사용자: "@concept 현대 판타지 아이디어"
→ ConceptAgent: "현대 판타지 설정으로는..."
사용자: "그 세계관에 마법 시스템을 추가하고 싶어"
→ ConceptAgent는 이전 대화를 보고 "현대 판타지" 맥락 유지
```

**시나리오 2 - 에이전트 간 컨텍스트 전달**
```
사용자: "@concept 현대 판타지 아이디어"
→ ConceptAgent가 로그라인 생성
사용자: "@world 이 세계관의 마법 시스템 설계해줘"
→ WorldBuilderAgent가 ConceptAgent의 설정을 참조
```

**한계 및 향후 개선**:
- **토큰 길이**: 요약 로직 필요 (Phase 2)
- **영속성**: 파일 기반 저장 (Phase 2)
- **프라이버시**: 개인정보 필터링 (향후 고려)

---

## 🚀 구현 우선순위 (Oracle 권장)

### Phase A: 아키텍처 강화 (2일)
**목표**: oh-my-openagent의 핵심 패턴을 선택적으로 적용

**Day 1: Intent & Context**
- [ ] Intent Parser 하이브리드 업그레이드
  - 명시적 @agent 멘션 확인
  - 패턴 매칭 (critique, drafting 키워드)
  - 모호성 질문 메커니즘
- [ ] ContextManager 4단계 구조 구현
  - Global Canon (세계관 바이블)
  - Rolling Summary (세션 요약)
  - Agent Notes (에이전트별 기억)
  - Recent Turns (최근 대화)

**Day 2: Category & Orchestration**
- [ ] Category-Based Model Selection 4모드 구현
  - planning (temperature 0.8)
  - drafting (temperature 0.7)
  - critique (temperature 0.3)
  - editing (temperature 0.2)
- [ ] Director multi-agent 체인 추가
  - `concept → world → character` (기획 체인)
  - `scene → critic → editor` (집필-검수 체인)

### Phase B: Prompt Engineering (1일)
**목표**: 공통 scaffold 적용

- [ ] PromptScaffold 인터페이스 정의
- [ ] Agent별 constraint/outputFormat 정의
  - Concept: "3개 로그라인, hook 포함"
  - Scene: "한 장면, POV 유지, hook 마무리"
  - Critic: "rewrite 금지, 문제 식별만"
  - Editor: "의미/톤 보존, 명확성 개선"

### Phase C: LLM Core (3일)
**목표**: 기존 계획대로 LLM 통합

- [ ] LLM 클라이언트 구현
- [ ] Fallback Chain 적용
- [ ] Graceful Degradation 3단계
  - Full: claude-3-sonnet
  - Reduced: claude-3-haiku
  - Offline: 정적 템플릿

### Phase D: Agent Rollout (6일)
**목표**: 9개 에이전트에 통합 패턴 적용

**MVP 우선 (3일)**
- [ ] Director (체인 포함)
- [ ] Concept (4단계 컨텍스트 사용)
- [ ] Scene (category: drafting)

**나머지 확장 (3일)**
- [ ] World, Character, Plot (category: planning)
- [ ] Dialogue (category: drafting)
- [ ] Critic (category: critique)
- [ ] Editor (category: editing)

**총 예상**: 12-14일 (기존 13-15일 → 패턴 적용으로 품질 향상, 리스크 감소)

---

## 📚 참고 문서

- **oh-my-openagent**: https://github.com/code-yeongyu/oh-my-openagent
  - `src/shared/model-resolution-pipeline.ts`
  - `src/shared/model-requirements.ts`
  - `src/shared/model-availability.ts`
- **DESIGN.md**: oh-my-novelist 프로젝트 설계 문서
- **AGENTS.md**: 에이전트 아키텍처 문서
- **Anthropic SDK**: https://github.com/anthropics/anthropic-sdk-typescript

---

**작성**: Sisyphus  
**버전**: 1.2 (Oracle 검토 + oh-my-openagent 패턴 선별 반영)  
**검토**: 대기 중  
**승인**: 대기 중
