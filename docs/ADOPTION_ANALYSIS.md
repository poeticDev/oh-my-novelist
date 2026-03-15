# Oh My Novelist에 도입할 Oh-My-OpenAgent 구조 분석

## 분석 개요

**참고 문서**: `/Users/poeticdev/Documents/workspace/opencode-plugin-reference/oh-my-openagent-reference.md`
**대상**: Oh My Novelist 플러그인에 도입할 만한 구조와 기능

---

## 1. ✅ 도입 권장: 카테고리 시스템 (Category System)

### 현재 상태
- 단일 설정으로 모든 창작 활동 처리

### 제안
```yaml
# .opencode/config.yaml
categories:
  novel-planning:
    description: 기획 및 설계 단계
    model: claude-opus
    temperature: 0.8
    prompt_append: "창의적 기획과 브레인스토밍에 최적화"
    
  novel-writing:
    description: 실제 집필 단계
    model: claude-sonnet
    temperature: 0.7
    prompt_append: "생동감 있는 문체와 흡입력 있는 서술"
    
  novel-editing:
    description: 교정 및 편집 단계
    model: claude-haiku
    temperature: 0.3
    prompt_append: "정확한 문법과 간결한 문장"
```

### 적용 시나리오
```typescript
// 기획 단계
task({
  category: "novel-planning",
  prompt: "현대 판타지 기획..."
})

// 집필 단계
task({
  category: "novel-writing", 
  prompt: "1화 장면 작성..."
})

// 편집 단계
task({
  category: "novel-editing",
  prompt: "문장 다듬기..."
})
```

**우선순위**: 높음 ⭐⭐⭐⭐⭐

---

## 2. ✅ 도입 권장: 인텐트 게이트 (Intent Gate)

### 현재 상태
- Director가 단순히 명령을 받아 처리

### 제안
의도 분류 시스템 도입:

| 표면적 요청 | 진정한 의도 | 처리 방식 |
|-----------|-----------|----------|
| "이 아이디어 어때?" | 평가/피드백 | Critic → 작가에게 제안 |
| "장면 써줘" | 구현 | Scene Writer 호출 |
| "캐릭터 만들어줘" | 설계 | Character Designer 호출 |
| "봐줘" / "검토해줘" | 검토 | Critic → Editor 순차 처리 |
| "~하는 내용으로" | 기획 | Concept Agent 호출 |

### 구현 방식
```yaml
# agent.yaml에 intent_routing 추가
intent_routing:
  evaluate:
    patterns: ["어때", "어떨까", "검토", "봐줘"]
    agent: critic
  
  implement:
    patterns: ["써줘", "만들어줘", "생성"]
    agent: scene-writer
  
  design:
    patterns: ["설계", "구조", "기획"]
    agent: concept
```

**우선순위**: 높음 ⭐⭐⭐⭐⭐

---

## 3. ✅ 도입 권장: Todo 관리 시스템

### 현재 상태
- 외부 관리 없음

### 제안
창작 과정을 Todo로 추적:

```typescript
// 새 작품 시작 시
todowrite({
  todos: [
    { content: "컨셉 및 로그라인 확정", status: "pending", priority: "high" },
    { content: "세계관 설정", status: "pending", priority: "high" },
    { content: "주인공 캐릭터 설계", status: "pending", priority: "high" },
    { content: "전체 플롯 구조", status: "pending", priority: "high" },
    { content: "1화 집필", status: "pending", priority: "medium" },
    { content: "피드백 및 수정", status: "pending", priority: "medium" }
  ]
})
```

### 에이전트 연동
각 에이전트가 작업 완료 시 자동으로 상태 업데이트:

```yaml
# agent.yaml
todo_integration:
  auto_update: true
  on_complete: "mark_done_and_suggest_next"
```

**우선순위**: 중간 ⭐⭐⭐⭐

---

## 4. ✅ 도입 권장: 스킬 시스템 개선

### 현재 상태
- Markdown 문서로만 정의

### 제안: MCP 통합 스킬
```yaml
# skills/novel-writing/skill.yaml
---
name: novel-writing
description: 웹소설 창작 전문 스킬
mcp:
  obsidian-vault:
    command: node
    args: ["./tools/obsidian-mcp.js"]
  template-generator:
    command: python
    args: ["./tools/template_mcp.py"]
---

# Novel Writing Skill Prompt

당신은 웹소설 창작 전문가입니다...
```

### MCP 도구 예시
1. **Obsidian Vault MCP**: Vault 읽기/쓰기/검색
2. **Template MCP**: 템플릿 생성 및 관리
3. **Export MCP**: 다양한 형식으로 낸내기

**우선순위**: 높음 ⭐⭐⭐⭐⭐

---

## 5. ⚠️ 부분 도입: 백그라운드 에이전트

### 적용 가능한 시나리오
```typescript
// 작가가 집필 중일 때 병렬로 실행
const researchTask = task({
  category: "deep",
  prompt: "이 장르의 최신 트렌드 조사",
  run_in_background: true
})

// 작가는 계속 집필
// ...

// 나중에 결과 확인
const trends = await background_output(researchTask)
```

### Novelist 특화 사용법
- **자료 조사**: 시대 배경, 전문 지식
- **일관성 검사**: 캐릭터/설정 검증
- **트렌드 분석**: 유사 작품 비교

**우선순위**: 중간 ⭐⭐⭐⭐

---

## 6. ⚠️ 부분 도입: 명령어 시스템

### 적용 가능한 명령어
```
/novel-new [작품명]       # 새 작품 시작
/novel-continue [작품명]  # 기존 작품 이어서
/novel-outline            # 전체 구조 보기
/novel-stats              # 작성 통계
/novel-export [format]    # 낸내기 (epub, pdf)
```

### 구현 방식
```typescript
// .opencode/commands/novel-new.ts
export default defineCommand({
  name: "novel-new",
  description: "새 웹소설 프로젝트 시작",
  handler: async (args) => {
    const projectName = args[0]
    // 프로젝트 생성 로직
  }
})
```

**우선순위**: 중간 ⭐⭐⭐⭐

---

## 7. ❌ 미도입: 해시 앵커드 편집

### 이유
- 코드 편집 도구로, 소설 텍스트에는 과도함
- Markdown은 단순 텍스트라 충돌 가능성 낮음
- Obsidian 자체 버전 관리로 충분

**대안**: Obsidian Git 연동

---

## 8. ⚠️ 부분 도입: 훅 시스템

### 적용 가능한 훅
```typescript
// PreToolUse: Obsidian 쓰기 전 검증
hooks.preToolUse("obsidian_write", (params) => {
  // 프론트매터 형식 검증
  // 파일명 규칙 확인
})

// Message: 키워드 감지
hooks.message((content) => {
  if (content.includes("ultrawork")) {
    enableRalphLoop()
  }
})
```

**우선순위**: 낮음 ⭐⭐⭐

---

## 9. ❌ 미도입: LSP/AST-Grep 도구

### 이유
- 소설은 코드가 아님
- 문법 검사는 Editor 에이전트가 담당
- AST는 소설에 적용 불가

**대안**: Editor 에이전트의 규칙 기반 검사

---

## 10. ✅ 도입 권장: 에이전트 위임 패턴

### 6가지 필수 프롬프트 요소 적용
```typescript
task({
  category: "novel-writing",
  load_skills: ["novel-writing"],
  prompt: `
    TASK: 1화 장면 작성
    CONTEXT: 현대 판타지, 주인공 첫 마법 각성
    MUST DO: 
      - 감각적 디테일 포함 (5감)
      - 쇼 돈 텔 원칙
      - 회차 끝에 훅 배치
    MUST NOT DO:
      - 설정 과다 설명
      - 타 캐릭터 과다 등장
    EXPECTED: 2000-3000자 분량의 몰입감 있는 장면
  `
})
```

**우선순위**: 높음 ⭐⭐⭐⭐⭐

---

## 종합 권장사항

### 즉시 도입 (Priority 1)
1. **카테고리 시스템**: 창작 단계별 모델/온도 조절
2. **인텐트 게이트**: 작가 요청의 진정한 의도 파악
3. **스킬 MCP**: Obsidian/템플릿/낸내기 도구 연동
4. **에이전트 위임 패턴**: 명확한 프롬프트 구조

### 단계적 도입 (Priority 2)
5. **Todo 관리**: 창작 과정 추적
6. **명령어 시스템**: 자주 쓰는 작업 단축
7. **백그라운드 에이전트**: 병렬 조사/검증

### 고려중 (Priority 3)
8. **훅 시스템**: 검증 및 자동화

### 미도입
9. 해시 앵커드 편집, LSP/AST-Grep (소설에는 부적합)

---

## 다음 단계

1. **카테고리 시스템 구현**: `.opencode/config.yaml`에 정의
2. **인텐트 게이트 추가**: Director 에이전트에 라우팅 로직
3. **MCP 도구 개발**: Obsidian 연동 Python/Node 스크립트
4. **명령어 구현**: 자주 쓰는 작업을 slash command로

**어떤 것부터 시작할까요?**
