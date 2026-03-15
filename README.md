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
- **카테고리 시스템**: 창작 단계별 최적화된 AI 모델
- **인텐트 게이트**: 자동 의도 분석 및 에이전트 라우팅
- **Todo 관리**: 체계적인 창작 과정 추적
- **슬래시 명령어**: 빠른 작업 실행

## 설치 방법

### 방법 1: GitHub에서 직접 설치 (권장)

```bash
opencode plugin install poeticDev/oh-my-novelist
```

### 방법 2: 로컬 경로로 설치 (개발/테스트용)

```bash
# 1. 저장소 클론
git clone https://github.com/poeticDev/oh-my-novelist.git
cd oh-my-novelist

# 2. OpenCode에 로컬 플러그인으로 등록
opencode plugin install ./

# 또는 특정 경로 지정
opencode plugin install /Users/poeticdev/Documents/workspace/oh-my-novelist
```

### 방법 3: 수동 설치

```bash
# 1. 플러그인 디렉토리로 이돛
mkdir -p ~/.config/opencode/plugins
cd ~/.config/opencode/plugins

# 2. 저장소 클론
git clone https://github.com/poeticDev/oh-my-novelist.git

# 3. OpenCode 설정에 추가
# ~/.config/opencode/config.yaml 또는 .opencode/config.yaml에 추가:
plugins:
  - name: oh-my-novelist
    path: ~/.config/opencode/plugins/oh-my-novelist
    enabled: true
```

## 설정

### 1. Obsidian Vault 경로 설정

```bash
# 환경 변수 설정
export OBSIDIAN_VAULT_PATH="~/Obsidian/MyVault"

# 또는 .zshrc/.bashrc에 추가
echo 'export OBSIDIAN_VAULT_PATH="~/Obsidian/MyVault"' >> ~/.zshrc
```

### 2. 프로젝트 기본 경로 설정

```yaml
# ~/.config/opencode/oh-my-novelist.yaml
project:
  default_path: "~/Documents/novels"
  
obsidian:
  enabled: true
  vault_path: "~/Obsidian/MyVault"
  sync_mode: auto
```

## 사용법

### 슬래시 명령어

```bash
# 새 작품 시작
/novel-new "작품명"
/novel-new "마법사의 탑" --template fantasy

# 기존 작품 이어서
/novel-continue "작품명"
/novel-continue "마법사" --agent scene

# 낸내기
/novel-export "작품명" --format epub
/novel-export "작품명" --format pdf --chapters 1 2 3

# Todo 관리
/novel-todo show "작품명"
/novel-todo progress "작품명"
/novel-todo update "작품명" --todo_id P001 --status completed

# 통계 확인
/novel-stats "작품명"
/novel-stats "작품명" --detail_level detailed
```

### 에이전트 호출

```bash
# 기본 (Director가 자동으로 분석)
@novel "현대 판타지 아이디어"

# 특정 에이전트 직접 호출
@concept "로맨스 컨셉"
@world "마법 시스템 설계"
@character "주인공 프로필"
@plot "3막 구조"
@scene "1화 장면"
@dialogue "대화 작성"
@critic "이 장면 검토해줘"
@editor "문장 다듬어줘"
```

## 테스트

### 빠른 테스트

```bash
# 1. 플러그인 설치 확인
opencode plugin list
# oh-my-novelist가 목록에 있는지 확인

# 2. 새 작품 생성 테스트
/novel-new "테스트 작품"

# 3. Director와 대화
@novel "안녕"
```

### 전체 기능 테스트

```bash
# 1. 새 작품 생성
/novel-new "30대 마법사 개발자" --template fantasy

# 2. 기획 단계
@concept "현대 판타지 장르로 기획해줘"

# 3. 세계관 설계
@world "마법 시스템 설계해줘"

# 4. 캐릭터 생성
@character "30대 주인공 개발자"

# 5. 1화 집필
@scene "주인공이 마법을 각성하는 장면"

# 6. 진행 상황 확인
/novel-todo progress "30대 마법사 개발자"

# 7. 낸내기
/novel-export "30대 마법사 개발자" --format markdown
```

## 프로젝트 구조

```
oh-my-novelist/
├── .opencode/
│   ├── config.yaml          # 플러그인 설정
│   ├── agents/              # 9개 에이전트 정의
│   │   ├── director/        # 단일 진입점
│   │   ├── concept/         # 기획자
│   │   ├── world-builder/   # 세계관 설계사
│   │   ├── character/       # 캐릭터 디자이너
│   │   ├── plot/            # 플롯 설계사
│   │   ├── scene/           # 장면 작가
│   │   ├── dialogue/        # 대화 작가
│   │   ├── critic/          # 리뷰어
│   │   └── editor/          # 편집자
│   └── commands/            # 5개 슬래시 명령어
│       ├── novel-new.yaml
│       ├── novel-continue.yaml
│       ├── novel-export.yaml
│       ├── novel-todo.yaml
│       └── novel-stats.yaml
├── skills/
│   └── novel-writing/       # 스킬 및 MCP 도구
│       ├── README.md
│       └── tools/
│           ├── todo-manager.yaml
│           ├── obsidian_vault_mcp.py
│           ├── template_generator_mcp.py
│           └── MCP_README.md
├── templates/               # 작품 템플릿
│   ├── default/
│   ├── fantasy/
│   ├── romance/
│   └── thriller/
├── docs/
│   ├── ADOPTION_ANALYSIS.md # Oh-My-OpenAgent 분석
│   └── TEST_SIMULATION.md   # 테스트 시뮬레이션
├── AGENTS.md                # 에이전트 상세 문서
├── CONFIGURATION.md         # 설정 가이드
├── package.json             # npm 설정
└── README.md                # 이 파일
```

## 에이전트 목록

| 에이전트 | 역할 | 카테고리 | 설명 |
|----------|------|----------|------|
| Director | 단일 진입점 | novel-planning | 작가와 1:1 대화, 의도 분석, 에이전트 라우팅 |
| Concept Agent | 기획자 | novel-planning | 장르, 컨셉, 로그라인 개발 |
| World Builder | 세계관 설계사 | novel-planning | 배경, 규칙, 역사 구축 |
| Character Designer | 캐릭터 디자이너 | novel-planning | 인물, 관계, 성장 설계 |
| Plot Architect | 플롯 설계사 | novel-planning | 구조, 전개, 훅 설계 |
| Scene Writer | 장면 작가 | novel-writing | 장면, 지문 작성 |
| Dialogue Writer | 대화 작가 | novel-writing | 대사, 말투, 서브텍스트 |
| Critic | 리뷰어 | novel-analysis | 피드백, 분석, 개선 제안 |
| Editor | 편집자 | novel-editing | 문장 다듬기, 스타일 통일 |

## 시스템 아키텍처

### 카테고리 시스템
- **novel-planning** (기획): 창의적 사고, Claude Opus, temp: 0.8
- **novel-writing** (집필): 생동감 있는 서술, Claude Sonnet, temp: 0.7
- **novel-editing** (편집): 정확한 교정, Claude Sonnet, temp: 0.3
- **novel-analysis** (분석): 객관적 평가, Claude Opus, temp: 0.4

### 인텐트 게이트
작가의 요청을 7가지 의도로 자동 분류:
- planning (기획), worldbuilding (세계관), character (캐릭터)
- plotting (플롯), writing (집필), reviewing (검토), editing (편집)

### Todo 관리
- 6개 단계 (기획 → 세계관 → 캐릭터 → 플롯 → 집필 → 편집)
- 30-32개 작업 (템플릿별 상이)
- 우선순위: Critical > High > Medium > Low
- 자동 진행 상황 추적

## 문제 해결

### 플러그인이 목록에 안 보여요
```bash
# 플러그인 캐시 초기화
opencode plugin cache clear

# 다시 설치
opencode plugin uninstall oh-my-novelist
opencode plugin install poeticDev/oh-my-novelist
```

### Obsidian 동기화가 안 돼요
```bash
# 1. 환경 변수 확인
echo $OBSIDIAN_VAULT_PATH

# 2. 경로가 존재하는지 확인
ls -la ~/Obsidian/MyVault

# 3. 쓰기 권한 확인
ls -ld ~/Obsidian/MyVault
```

### 명령어가 작동하지 않아요
```bash
# 플러그인 활성화 확인
opencode plugin list

# 설정 다시 로드
opencode config reload

# 디버그 모드로 실행
opencode --verbose
```

## 기여

버그 리포트나 기능 제안은 GitHub Issues에 남겨주세요.

```bash
# 개발용 포크
git clone https://github.com/poeticDev/oh-my-novelist.git
cd oh-my-novelist

# 브랜치 생성
git checkout -b feature/my-feature

# 변경사항 커밋
git add .
git commit -m "Add my feature"

# 푸시
git push origin feature/my-feature

# PR 생성
```

## 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

## 감사의 말

- [Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode) - 영감을 주신 프로젝트
- OpenCode 팀 - 멋진 플랫폼 제공
- 모든 웹소설 작가들 - 창작의 열정

---

**Happy Writing! 📝✨**
