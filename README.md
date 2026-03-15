# Oh My Novelist

웹소설 창작을 위한 OpenCode 플러그인

## 개요

Oh My Novelist는 OpenCode 환경에서 작동하는 웹소설 창작 지원 플러그인입니다. 
작가와 AI 에이전트가 협동(co-creation)하며 소설을 기획하고 작성합니다.

## 특징

- **협동 모드**: 작가와 AI가 실시간으로 브레인스토밍
- **전문화된 에이전트**: 기획자, 세계관 설계사, 캐릭터 디자이너 등 9개 역할
- **Obsidian 연동**: 작성 내용을 Obsidian vault에 자동 저장
- **템플릿 기반**: 표준화된 창작 프로세스 제공

## 설치

```bash
# OpenCode에 플러그인 등록
opencode plugin install oh-my-novelist
```

## 사용법

```bash
# 새 작품 시작
@novel-new "작품명"

# 기존 작품 이어서
@novel-continue "작품명"

# 특정 에이전트 호출
@concept-agent
@character-agent
@plot-agent
```

## 프로젝트 구조

```
oh-my-novelist/
├── .opencode/
│   └── agents/          # 에이전트 정의
│       ├── director/    # 단일 진입점
│       ├── concept/     # 기획자
│       ├── world-builder/
│       ├── character/
│       ├── plot/
│       ├── scene/
│       ├── dialogue/
│       ├── critic/
│       └── editor/
├── skills/
│   └── novel-writing/   # 스킬 정의
├── templates/           # 작품 템플릿
└── examples/           # 예시 작품
```

## 에이전트 목록

| 에이전트 | 역할 | 파일 |
|----------|------|------|
| Director | 단일 진입점, 작가와 1:1 대화 | `.opencode/agents/director/` |
| Concept Agent | 장르, 컨셉, 로그라인 | `.opencode/agents/concept/` |
| World Builder | 세계관, 규칙, 역사 | `.opencode/agents/world-builder/` |
| Character Designer | 인물, 관계, 성장 | `.opencode/agents/character/` |
| Plot Architect | 구조, 전개, 훅 | `.opencode/agents/plot/` |
| Scene Writer | 장면, 지문 | `.opencode/agents/scene/` |
| Dialogue Writer | 대화, 대사 | `.opencode/agents/dialogue/` |
| Critic | 피드백, 분석 | `.opencode/agents/critic/` |
| Editor | 편집, 다듬기 | `.opencode/agents/editor/` |

## 라이선스

MIT
