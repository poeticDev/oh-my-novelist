# Oh My Novelist

웹소설 창작을 위한 OpenCode 플러그인

## 개요

Oh My Novelist는 OpenCode 환경에서 작동하는 웹소설 창작 지원 플러그인입니다. 
작가와 AI 에이전트가 협동(co-creation)하며 소설을 기획하고 작성합니다.

## 현재 구현된 기능

### 핵심 구현 완료
- ✅ **9개 전문 에이전트 구조**: Director, Concept, World Builder, Character, Plot, Scene, Dialogue, Critic, Editor
- ✅ **Director 중심 라우팅**: 모든 대화가 Director를 통해 처리되고 적절한 에이전트로 분배
- ✅ **@멘션 지원**: @concept, @world, @character, @plot, @scene, @dialogue, @critic, @editor로 직접 에이전트 호출
- ✅ **프로젝트 상태 지속**: JSON 파일로 상태 저장 (`.oh-my-novelist/state.json`)
  - 현재 프로젝트 추적
  - 프로젝트별 메타데이터 (단계, 마지막 접근 시간)
- ✅ **Todo 지속성**: 디스크 기반 Todo 관리 (`.oh-my-novelist/todos/{프로젝트명}.json`)
  - 8개 기본 Todo 자동 생성 (planning → writing)
  - 상태 관리: pending, in_progress, completed, cancelled
  - 단계별 진행률 계산
  - 멱등한 생성 (force 옵션으로 재생성 가능)
- ✅ ** novelist_todo 도구 등록**: OpenCode 도구로 Todo 관리 기능 노출
  - `create`, `list`, `update`, `progress` 액션 지원
- ✅ **Director 상태 인식**: 현재 프로젝트, 진행 상황, 다음 작업 제안

### LLM 통합 기능
- ✅ **OpenCode-native 모델 정책 레이어**: provider/auth/runtime은 OpenCode가 담당하고, 플러그인은 novelist 전용 모델 정책과 프롬프트 라우팅을 담당
- ✅ **오프라인 폴백 모드**: API 키 없이도 기본 기능 사용 가능
- ✅ **컨텍스트 관리**: 대화 기록 및 프로젝트 상태 유지
- ✅ **프롬프트 빌더**: 동적 프롬프트 생성 및 변수 치환

### 부분 구현 / 실험적 기능
- ⚠️ **상태 진행 추적**: Todo 기반으로 작동하나 자동 단계 전환은 없음

## 계획된 기능 (Phase 2)

- 📝 **템플릿 시스템**: 캐릭터 시트, 사건 구조, 회차 템플릿 파일 생성
- 📝 **자동 단계 전환**: Todo 완료 시 다음 단계 자동 제안

## 빠른 시작 (Quick Start)

### 새 프로젝트 시작하기

```bash
# 1. 프로젝트 초기화 (자동으로 todos 생성됨)
novelist_init_project(projectName: "나의 판타지 소설")

# 2. 상태 확인
"상태" 또는 "진행"

# 3. Todo 업데이트
novelist_todo(action: "update", todoId: "P001", status: "in_progress")

# 4. 에이전트 호출
@concept 현대 판타지 아이디어
```

### 실제 사용 예시

**처음 사용자:**
```
작가: 안녕하세요
Director: 👋 Oh My Novelist에 오신 것을 환영합니다!
       새 작품을 시작하시려면 다음을 입력하세요:
       • novelist_init_project 도구로 "프로젝트명" 생성

작가: novelist_init_project "나의 판타지"
[프로젝트 생성됨, 8개 Todo 자동 생성]

작가: 상태
Director: 📊 "나의 판타지" 프로젝트 현황
       🎯 현재 단계: 기획
       📈 전체 진행: 0% 완료
       💡 추천 다음 작업: "기획" 단계 시작하기: "장르 및 타겟 독자층 정의" (P001)
```

**기존 사용자:**
```
작가: 안녕
Director: 👋 안녕하세요, 작가님!
       📖 현재 프로젝트: "나의 판타지"
       🎯 현재 단계: 기획
       💡 추천 다음 작업: 진행 중인 작업 완료하기: "장르 및 타겟 독자층 정의" (P001)

작가: @concept 주인공 아이디어
[Concept Agent 응답]

작가: novelist_todo update P001 completed
[상태 업데이트됨, 자동으로 다음 단계 제안]
```

## LLM 설정

Oh My Novelist는 provider/auth/runtime을 직접 소유하지 않습니다.

- **Provider 연결과 모델 선택**: OpenCode에서 `/connect`, `/models`, provider 설정으로 관리
- **Novelist 전용 정책 설정**: repo root `oh-my-novelist.jsonc`
- **호환성 경로**: 새 정책 파일이 없을 때는 기존 `ANTHROPIC_API_KEY` 기반 동작을 유지

### Guided Setup으로 설정하기 (권장)

`novelist_setup` 도구를 사용하여 안전하게 설정하세요.

```bash
# 1. 현재 상태 확인
novelist_setup(action: "inspect")

# 2. 설정 미리보기 (파일 생성 없이)
novelist_setup(action: "preview")

# 3. 설정 적용
novelist_setup(action: "apply")
```

**주요 기능**:
- `inspect`: 현재 설정 상태와 유효성 확인
- `preview`: 생성될 설정 내용 미리보기 (덮어쓰기 영향 포함)
- `apply`: 설정 파일 생성/업데이트 (백업 자동 생성)

기존 설정 파일이 있으면 백업(`oh-my-novelist.jsonc.bak.YYYYMMDD-HHMMSS`)이 자동으로 생성됩니다.

### OpenCode에서 provider 연결

OpenCode에서 provider 연결 및 모델 선택을 먼저 수행하세요.

```text
/connect
/models
```

Provider API 키, base URL, custom/local model 등의 설정은 OpenCode 설정에서 관리하며, 플러그인은 이 정보에 접근하거나 저장하지 않습니다.

### Anthropic 호환성 경로

1. `.env.example` 파일을 `.env`로 복사:
   ```bash
   cp .env.example .env
   ```

2. [Anthropic Console](https://console.anthropic.com/settings/keys)에서 API 키 발급

3. `.env` 파일에 API 키 추가:
   ```bash
   ANTHROPIC_API_KEY=your_api_key_here
   ```

이 경로는 **기존 Anthropic-first 기본 동작을 유지하기 위한 호환성 경로**입니다.

### novelist 정책 설정 (`oh-my-novelist.jsonc`)

플러그인 쪽에서는 provider/runtime 정보를 넣지 않고, novelist 전용 정책만 설정합니다.

```jsonc
{
  "version": "1.0",
  "global": {
    "defaultModel": "anthropic/claude-3-5-sonnet-20241022",
    "defaultFamily": "claude"
  },
  "categories": {
    "editing": {
      "defaultModel": "openai/gpt-4o-mini",
      "defaultFamily": "gpt"
    }
  },
  "agents": {
    "editor": {
      "preferredFamily": "gpt"
    }
  }
}
```

허용되는 것은 다음뿐입니다.

- global/category/agent 정책
- explicit model override
- model family (`claude`, `gpt`) 라우팅

넣으면 안 되는 값:

- API key / credentials / auth
- baseURL / endpoint / transport / retries
- provider registry 설정

### 오프라인 모드 (provider 미연결 또는 API 키 없이 사용)

API 키가 없어도 플러그인의 기본 기능은 사용할 수 있습니다:
- 프로젝트 및 Todo 관리
- Director 라우팅 및 상태 확인
- 템플릿 및 파일 구조 작업

AI 에이전트 응답 기능은 OpenCode provider 연결 또는 Anthropic 호환성 경로 설정 후 사용 가능합니다.

## 현재 제한 사항

1. **수동 상태 관리**: Todo 상태 업데이트는 수동으로 수행해야 함
2. **템플릿 미지원**: 템플릿 생성 및 적용 기능 미구현
3. **자동 단계 전환 제한**: Todo 완료 시 단계 추론은 되지만 자동 진행은 없음

## 설치 방법

### 방법 1: GitHub에서 직접 설치

```bash
opencode plugin install poeticDev/oh-my-novelist
```

### 방법 2: 로컬 개발

```bash
# 1. 저장소 클론
git clone https://github.com/poeticDev/oh-my-novelist.git
cd oh-my-novelist

# 2. 의존성 설치
npm install

# 3. 빌드
npm run build

# 4. OpenCode에 등록
opencode plugin install ./
```

## TODO: OpenCode 의존성

이 플러그인은 OpenCode 런타임에서 제공하는 패키지를 사용합니다:

- `@opencode-ai/plugin` - 플러그인 인터페이스
- `@opencode-ai/sdk` - OpenCode SDK

이 패키지들은 npm에 공개되어 있지 않으며, OpenCode가 설치된 환경에서만 사용 가능합니다.

**필요한 OpenCode 버전**: 1.2.24 이상

## 사용법

### 에이전트 호출

```bash
# Director를 통한 일반 대화
안녕하세요

# 특정 에이전트 직접 호출
@concept 현대 판타지 아이디어
@world 마법 시스템 설계
@character 주인공 프로필
@plot 3막 구조
@scene 1화 장면
@dialogue 대화 작성
@critic 이 장면 검토해줘
@editor 문장 다듬어줘
```

### 프로젝트 상태 확인

```bash
상태
진행상황
progress
```

## 빌드

```bash
npm run build        # TypeScript 컴파일
npm run typecheck    # 타입 검사만
npm run clean        # dist 폴 제거
```

## 프로젝트 구조

```
oh-my-novelist/
├── src/
│   ├── index.ts              # 플러그인 진입점
│   ├── agents/               # 9개 에이전트 구현
│   │   ├── director.ts       # 단일 진입점 (메인 오케스트레이터)
│   │   ├── concept.ts        # 기획자
│   │   ├── world-builder.ts  # 세계관 설계사
│   │   ├── character.ts      # 캐릭터 디자이너
│   │   ├── plot.ts           # 플롯 설계사
│   │   ├── scene.ts          # 장면 작가
│   │   ├── dialogue.ts       # 대화 작가
│   │   ├── critic.ts         # 리뷰어
│   │   ├── editor.ts         # 편집자
│   │   ├── prompts/          # 에이전트 시스템 프롬프트
│   │   │   ├── director.md
│   │   │   ├── concept.md
│   │   │   ├── character.md
│   │   │   ├── world-builder.md
│   │   │   ├── plot.md
│   │   │   ├── critic.md
│   │   │   ├── scene.md
│   │   │   ├── dialogue.md
│   │   │   └── editor.md
│   │   └── base.ts           # 에이전트 인터페이스
│   ├── tools/
│   │   └── todo-manager.ts   # Todo 디스크 지속성
│   ├── utils/
│   │   ├── state.ts          # 프로젝트 상태 관리
│   │   ├── intent-parser.ts
│   │   └── categories.ts
│   └── types/
│       └── opencode.d.ts     # OpenCode 타입 선언
├── dist/                     # 빌드 출력
├── 01_works/                 # 작품 저장 폴
├── 02_worlds/                # 세계관 저장 폴
├── 03_templates/             # 템플릿 저장 폴
└── package.json
```

## 데이터 저장

플러그인은 다음 위치에 데이터를 저장합니다:

```
{현재 작업 디렉토리}/
├── .oh-my-novelist/
│   ├── state.json            # 세션 상태 (현재 프로젝트 등)
│   └── todos/
│       └── {프로젝트명}.json # 프로젝트별 Todo
├── 01_works/                 # 작품 파일
├── 02_worlds/                # 세계관 파일
└── 03_templates/             # 템플릿 파일
```

## 에이전트 목록

| 에이전트 | 역할 | 프롬프트 수준 | 설명 |
|----------|------|--------------|------|
| Director | 단일 진입점 | 상세 | 모든 대화의 진입점, 에이전트 라우팅 |
| Concept | 기획자 | 상세 | 장르, 컨셉, 로그라인 개발 |
| World Builder | 세계관 설계사 | 중간 | 배경, 규칙, 역사 구축 |
| Character Designer | 캐릭터 디자이너 | 상세 | 인물, 관계, 성장 설계 |
| Plot Architect | 플롯 설계사 | 중간 | 구조, 전개, 훅 설계 |
| Scene Writer | 장면 작가 | 간단 | 장면, 지문 작성 |
| Dialogue Writer | 대화 작가 | 간단 | 대사, 말투, 서브텍스트 |
| Critic | 리뷰어 | 중간 | 피드백, 분석, 개선 제안 |
| Editor | 편집자 | 간단 | 문장 다듬기, 스타일 통일 |

## 라이선스

MIT License

## 감사의 말

- [Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode) - 영감을 주신 프로젝트
- OpenCode 팀 - 멋진 플랫폼 제공

---

**Happy Writing! 📝✨**
