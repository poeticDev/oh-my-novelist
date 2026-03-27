# Oh My Novelist - LLM 통합 계획 문서
## oh-my-openagent 참고 분석 기반

**작성일:** 2026-03-24  
**버전:** 1.0  
**상태:** 계획 수립 완료, 구현 대기

---

## 1. 개요 (Executive Summary)

### 목표
oh-my-novelist에 LLM 통합을 통해 정적 프롬프트 응답에서 동적 AI 생성 응답으로 전환

### oh-my-openagent 참고 핵심
- **LLM 클라이언트 추상화**: 벤더 독립적 설계
- **프롬프트 빌더 패턴**: 정적 파일 + 동적 변수 치환
- **컨텍스트 주입**: 프로젝트 상태, 대화 기록, Todo 진행 상황
- **단계별 롤아웃**: 하나의 에이전트부터 시작

---

## 2. 현재 상태 분석

### oh-my-novelist (현재)
| 영역 | 상태 | 설명 |
|------|------|------|
| 에이전트 구조 | ✅ 완료 | 9개 에이전트, Director 중심 라우팅 |
| 상태 관리 | ✅ 완료 | JSON 기반, Todo-단계 연동 |
| LLM 호출 | ❌ 미구현 | 정적 프롬프트 파일만 반환 |
| 프롬프트 관리 | ⚠️ 부분 | 파일 존재, 동적 구성 없음 |
| 컨텍스트 주입 | ❌ 미구현 | 프로젝트 상태 미활용 |

### oh-my-openagent (참고)
| 영역 | 상태 | 설명 |
|------|------|------|
| LLM 호출 | ✅ 구현됨 | 실제 LLM API 연동 |
| 프롬프트 관리 | ✅ 완료 | 파일 + 동적 변수 |
| 컨텍스트 주입 | ✅ 완료 | 대화 기록, 상태, 메타데이터 |
| 에이전트 구조 | ✅ 유사 | 동일한 9개 에이전트 패턴 |

---

## 3. 통합 계획

### Phase 1: LLM 클라이언트 (2-3일)
**목표:** 벤더 독립적 LLM 클라이언트 구축

```typescript
// src/llm/types.ts
export interface LLMClient {
  generate(
    agentType: string,
    prompt: string,
    context: NovelContext
  ): Promise<string>;
  
  stream?(
    agentType: string,
    prompt: string,
    context: NovelContext
  ): AsyncIterable<string>;
}

export interface NovelContext {
  project: ProjectState;
  todos: TodoItem[];
  conversation: string[]; // 최근 N개 메시지
  agentMemory: Record<string, unknown>;
}
```

**구현 순서:**
1. OpenCode SDK LLM API 조사
2. `src/llm/opencode-client.ts` 구현 (우선)
3. 실패 시 `src/llm/anthropic-client.ts` 폴백
4. `src/llm/factory.ts` - 클라이언트 선택 로직

**참고 패턴 (oh-my-openagent):**
```typescript
// oh-my-openagent의 추상화 패턴 적용
export class LLMClientFactory {
  static create(preferred?: string): LLMClient {
    // OpenCode SDK 확인 → Anthropic 직접 → 오프라인 모드
  }
}
```

---

### Phase 2: 프롬프트 빌더 (1-2일)
**목표:** 기존 프롬프트 파일을 동적 구성으로 전환

**현재:**
```markdown
<!-- src/agents/prompts/concept.md -->
당신은 웹소설 기획 전문가입니다...
```

**목표:**
```typescript
// src/prompts/builder.ts
export function buildPrompt(
  agentType: string,
  variables: Record<string, string>
): string {
  const template = loadPromptFile(agentType); // 기존 .md 파일
  return interpolate(template, variables);
}

// 사용 예시
const prompt = buildPrompt('concept', {
  projectName: '나의 판타지',
  currentPhase: 'planning',
  todoProgress: '2/8 완료',
  userRequest: '현대 판타지 아이디어'
});
```

**변수 목록:**
| 변수 | 설명 | 예시 |
|------|------|------|
| `{{projectName}}` | 프로젝트명 | "나의 판타지" |
| `{{currentPhase}}` | 현재 단계 | "planning" |
| `{{todoProgress}}` | Todo 진행 | "2/8 완료" |
| `{{userRequest}}` | 사용자 요청 | "현대 판타지 아이디어" |
| `{{conversationHistory}}` | 대화 기록 | "..." |

---

### Phase 3: ConceptAgent MVP (2-3일)
**목표:** 첫 번째 LLM 통합 에이전트 구현

**구현 내용:**
```typescript
// src/agents/concept.ts
export class ConceptAgent {
  readonly name = "Concept";
  readonly description = "웹소설 기획 전문가";
  
  async handle(
    content: string,
    project: string | null,
    context?: NovelContext
  ): Promise<string> {
    // 1. 컨텍스트 구성
    const ctx = await this.buildContext(project, content);
    
    // 2. 프롬프트 생성
    const prompt = buildPrompt('concept', {
      projectName: project || '미정',
      currentPhase: ctx.project?.currentPhase || 'planning',
      todoProgress: this.formatProgress(ctx.todos),
      userRequest: content
    });
    
    // 3. LLM 호출
    const llm = LLMClientFactory.create();
    const response = await llm.generate('concept', prompt, ctx);
    
    // 4. Graceful Degradation
    if (!response) {
      return this.getStaticFallback('concept');
    }
    
    return response;
  }
}
```

**테스트 시나리오:**
```
입력: "@concept 현대 판타지 아이디어"
↓
컨텍스트: {project: "나의 판타지", phase: "planning", todos: [...]}
↓
프롬프트: "당신은... 프로젝트: 나의 판타지, 단계: planning..."
↓
LLM 호출 → 동적 응답 생성
↓
출력: "현대 판타지 설정으로는 '소리로 마법을 부르는 세계'가..."
```

---

### Phase 4: 컨텍스트 관리 (2일)
**목표:** NovelContext 구성 및 캐싱

```typescript
// src/context/manager.ts
export class ContextManager {
  constructor(
    private directory: string,
    private state: SessionState
  ) {}
  
  async build(agentType: string, projectName: string | null): Promise<NovelContext> {
    return {
      project: projectName 
        ? getProjectState(this.directory, projectName) 
        : null,
      todos: projectName 
        ? this.loadTodos(projectName) 
        : [],
      conversation: this.getRecentConversation(10),
      agentMemory: this.loadAgentMemory(agentType, projectName)
    };
  }
  
  private loadTodos(projectName: string): TodoItem[] {
    const todoManager = new TodoManagerTool(this.directory);
    const result = todoManager.listTodos(projectName);
    return result.todos || [];
  }
  
  private getRecentConversation(limit: number): string[] {
    // 최근 대화 기록 (향후 구현)
    return [];
  }
  
  private loadAgentMemory(
    agentType: string, 
    projectName: string | null
  ): Record<string, unknown> {
    // 에이전트별 기억 (향후 구현)
    return {};
  }
}
```

---

### Phase 5: 나머지 에이전트 (3-4일)
**목표:** 동일한 패턴으로 8개 에이전트 확장

**우선순위:**
1. ConceptAgent (완료)
2. WorldBuilderAgent (세계관 설계)
3. CharacterAgent (캐릭터)
4. PlotAgent (플롯)
5. SceneAgent (장면)
6. DialogueAgent (대화)
7. CriticAgent (검토)
8. EditorAgent (편집)

**각 에이전트별 작업:**
- 프롬프트 변수 정의
- LLM 호출 통합
- 정적 폴백 유지

---

## 4. 아키텍처 변경

### 변경 전 (현재)
```
사용자 입력 → Director → 에이전트 선택 → 정적 프롬프트 읽기 → 반환
```

### 변경 후 (목표)
```
사용자 입력 → Director → 에이전트 선택 
  ↓
컨텍스트 구성 (프로젝트 + Todo + 대화)
  ↓
동적 프롬프트 생성 (템플릿 + 변수)
  ↓
LLM 호출 → 스트리밍 응답 → 반환
  ↓
[실패 시] 정적 프롬프트 폴백
```

---

## 5. 참고: oh-my-openagent 패턴

### 5.1 모듈 구조
```
oh-my-openagent/
├── agents/
│   ├── base.ts
│   ├── concept.ts
│   └── ...
├── llm/
│   ├── client.ts          # 인터페이스
│   ├── opencode.ts        # OpenCode 구현
│   └── anthropic.ts       # Anthropic 구현
├── prompts/
│   ├── concept.md
│   └── builder.ts         # 동적 구성
└── context/
    └── manager.ts         # 컨텍스트 관리
```

### 5.2 적용할 핵심 패턴

**1. LLM 클라이언트 추상화**
```typescript
// 벤더 종속성 제거
export interface LLMClient {
  generate(prompt: string, context: Context): Promise<string>;
}
```

**2. 프롬프트 버전 관리**
```typescript
// A/B 테스트 가능한 구조
const PROMPT_VERSIONS = {
  concept: ['v1', 'v2', 'v3'],
  worldBuilder: ['v1']
};
```

**3. Graceful Degradation**
```typescript
async function getResponse(): Promise<string> {
  const llmResponse = await tryLLM();
  if (llmResponse) return llmResponse;
  
  console.warn('LLM failed, using static fallback');
  return getStaticPrompt();
}
```

---

## 6. 리스크 및 완화 전략

| 리스크 | 영향도 | 완화 전략 |
|--------|--------|-----------|
| OpenCode SDK 미지원 | 높음 | Anthropic API 직접 호출 준비 |
| LLM API 비용 | 중간 | 사용량 모니터링, 캐싱 적용 |
| 컨텍스트 길이 초과 | 중간 | 요약 로직, 중요 정보 우선 |
| 응답 속도 지연 | 중간 | 스트리밍 적용, 타임아웃 설정 |
| 오프라인 사용 | 낮음 | 정적 폴백 유지 |

---

## 7. 타임라인

| Phase | 기간 | 작업 | 산출물 |
|-------|------|------|--------|
| 1 | 2-3일 | LLM 클라이언트 | `src/llm/` 모듈 |
| 2 | 1-2일 | 프롬프트 빌더 | `src/prompts/builder.ts` |
| 3 | 2-3일 | ConceptAgent MVP | 동적 응답 확인 |
| 4 | 2일 | 컨텍스트 관리 | `src/context/` 모듈 |
| 5 | 3-4일 | 전체 에이전트 | 9개 에이전트 LLM 통합 |

**총 예상 소요:** 10-14일

---

## 8. 다음 행동

### 즉시 실행 가능
- [ ] OpenCode SDK LLM API 문서 조사
- [ ] `src/llm/` 디렉토리 생성
- [ ] ConceptAgent LLM 통합 프로토타입

### 결정 필요
- [ ] OpenCode SDK LLM 지원 여부 확인
- [ ] Anthropic API 키 확보
- [ ] 사용량/비용 모니터링 방식

---

## 9. 파일 구조 변경 계획

### 새 파일
```
src/
├── llm/
│   ├── client.ts          # LLM 클라이언트 인터페이스
│   ├── types.ts            # LLM 관련 타입 정의
│   ├── opencode-client.ts  # OpenCode SDK 구현
│   ├── anthropic-client.ts # Anthropic API 직접 구현 (폴백)
│   └── factory.ts          # 클라이언트 팩토리
├── prompts/
│   ├── builder.ts          # 동적 프롬프트 빌더
│   ├── loader.ts            # 프롬프트 파일 로더
│   └── variables.ts         # 변수 정의
└── context/
    └── manager.ts          # 컨텍스트 관리
```

### 수정 파일
```
src/
├── agents/
│   ├── base.ts             # LLM 클라이언트 주입 인터페이스
│   ├── concept.ts           # LLM 통합 예시
│   └── [나머지 에이전트].ts  # 동일 패턴 적용
└── index.ts                # LLM 클라이언트 초기화
```

---

## 10. 참고 문서

- **oh-my-openagent**: https://github.com/code-yeongyu/oh-my-openagent
- **DESIGN.md**: oh-my-novelist 프로젝트 설계 문서
- **AGENTS.md**: 에이전트 아키텍처 문서
- **README.md**: 프로젝트 개요 및 빠른 시작

---

**작성:** Sisyphus  
**검토:** 대기 중