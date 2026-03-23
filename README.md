# Oh My Novelist

웹소설 창작을 위한 OpenCode 플러그인

## 개요

Oh My Novelist는 OpenCode 환경에서 작동하는 웹소설 창작 지원 플러그인입니다. 
작가와 AI 에이전트가 협동(co-creation)하며 소설을 기획하고 작성합니다.

## 현재 구현된 기능

- ✅ **9개 전문 에이전트**: Director(오케스트레이션), Concept(기획), World Builder(세계관), Character(캐릭터), Plot(플롯), Scene(장면), Dialogue(대화), Critic(검토), Editor(편집)
- ✅ **에이전트 프롬프트**: 상세(3개) + 중간(3개) + 간단(3개) 하이브리드 방식
- ✅ **프로젝트 상태 지속**: JSON 파일로 상태 저장 (.oh-my-novelist/state.json)
- ✅ **Todo 지속성**: 디스크에 Todo 저장 (.oh-my-novelist/todos/)
- ✅ **Director 중심 라우팅**: 모든 대화는 Director가 받아 적절한 에이전트로 분배
- ✅ **@멘션 지원**: @concept, @world, @character 등 직접 에이전트 호출

## 계획된 기능 (Phase 2)

- 📝 **템플릿 시스템**: 캐릭터, 사건, 회차 템플릿
- 📝 **Obsidian 연동**: 양방향 동기화
- 📝 **슬래시 명령어**: /novel-new, /novel-todo 등
- 📝 **AI 통합**: 실제 LLM 호출 연동

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
