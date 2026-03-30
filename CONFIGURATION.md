# Oh My Novelist Configuration Guide

Configuration documentation for the oh-my-novelist OpenCode plugin.

## Installation

### Prerequisites

- OpenCode installed and configured
- Node.js 18+ (for plugin runtime)

### Install via OpenCode CLI

```bash
# Install from registry
opencode plugin install oh-my-novelist

# Or install from local path
opencode plugin install /path/to/oh-my-novelist
```

### Verify Installation

```bash
opencode plugin list
# Should show: oh-my-novelist (0.1.0)
```

---

## LLM / Model Configuration (OpenCode-native)

Oh My Novelist는 provider runtime을 직접 소유하지 않습니다.

- **Provider 연결 / 인증 / 모델 카탈로그**: OpenCode가 소유
- **Novelist 전용 모델 정책**: `oh-my-novelist.jsonc`가 소유

### 1. OpenCode에서 provider 연결

```text
/connect
/models
```

provider API 키, custom endpoint, local model, transport option은 OpenCode 설정에서 관리합니다.

### 2. novelist 정책 파일 설정

repo root에 `oh-my-novelist.jsonc`를 두고 다음처럼 novelist 전용 정책만 설정합니다.

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

### 3. 이 파일에 넣으면 안 되는 항목

다음 항목은 OpenCode/provider 소유 범위이므로 `oh-my-novelist.jsonc`에 넣지 않습니다.

- `apiKey`, `credentials`, `auth`
- `baseURL`, `endpoint`, `url`
- `transport`, `timeout`, `retries`, `headers`
- `provider`, `providers`, `registry`, `adapter`

### 4. Anthropic 호환성 경로

정책 파일이 없을 때는 기존 `ANTHROPIC_API_KEY` 기반 동작을 유지합니다. 이 경로는 전환기 호환성 목적이며, 장기적으로는 OpenCode provider 설정이 기본입니다.

---

## Directory Structure

### Plugin Installation

```
~/.config/opencode/plugins/oh-my-novelist/
├── config.yaml              # User configuration
├── templates/               # Installed templates
│   ├── default/
│   ├── romance/
│   ├── fantasy/
│   └── thriller/
└── cache/                   # Runtime cache
```

### Project Structure

Each novel project follows this structure:

```
my-novel/
├── .novel/                  # Project metadata
│   ├── config.yaml          # Project-specific settings
│   ├── history.json         # Session history
│   └── agents.json          # Agent conversation logs
├── concept/                 # 기획 문서
│   ├── logline.md           # One-line summary
│   ├── synopsis.md          # Full synopsis
│   └── themes.md            # Themes and motifs
├── world/                   # 세계관
│   ├── setting.md           # World setting
│   ├── rules.md             # World rules/magic system
│   └── history.md           # World history/timeline
├── characters/              # 캐릭터
│   ├── main/                # Main characters
│   │   ├── protagonist.md
│   │   └── antagonist.md
│   └── supporting/          # Supporting characters
│       └── character-name.md
├── plot/                    # 플롯
│   ├── structure.md         # Overall structure
│   ├── arcs/                # Story arcs
│   │   └── arc-1.md
│   └── beats/               # Plot beats
│       └── act-1.md
├── episodes/                # 에피소드
│   ├── ep-001.md
│   ├── ep-002.md
│   └── drafts/              # Draft versions
│       └── ep-001-draft.md
└── exports/                 # 내보내기
    └── manuscript.md        # Full manuscript
```


