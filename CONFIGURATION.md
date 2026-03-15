# Oh My Novelist Configuration Guide

Configuration documentation for the oh-my-novelist OpenCode plugin.

## Installation

### Prerequisites

- OpenCode installed and configured
- Node.js 18+ (for plugin runtime)
- Obsidian (optional, for vault sync)

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

## Initial Setup

### Project Folder Selection

When you first run `@novel-new`, the plugin prompts for a project folder:

```
📁 Select project folder:
  > ~/Documents/novels/          (recommended)
  > ~/Desktop/my-novel/
  > Custom path...
```

**Default behavior:**
- Creates a new folder named after your novel
- Stores all project files in a structured hierarchy
- Remembers the last used directory

### Obsidian Vault Path Configuration

For Obsidian integration, configure the vault path:

```yaml
# ~/.config/opencode/plugins/oh-my-novelist/config.yaml
obsidian:
  enabled: true
  vault_path: "/Users/yourname/Obsidian/MyVault"
  sync_mode: "auto"  # auto | manual
```

**Setup steps:**

1. Open Obsidian and note your vault location
2. Run `@novel-config` to open settings
3. Enter the full path to your vault
4. Enable "Auto-sync to Obsidian" if desired

### Default Settings

Initial configuration defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| `language` | `ko` | Primary language (ko/en) |
| `auto_save` | `true` | Auto-save on changes |
| `save_interval` | `30` | Auto-save interval (seconds) |
| `template` | `default` | Project template name |
| `obsidian.enabled` | `false` | Obsidian sync toggle |
| `backup.enabled` | `true` | Auto-backup before major changes |

---

## Configuration Options

### Template Preferences

Templates define the initial structure for new projects.

**Available templates:**

| Template | Description |
|----------|-------------|
| `default` | Standard web novel structure |
| `romance` | Romance-focused with relationship arcs |
| `fantasy` | Fantasy with world-building emphasis |
| `thriller` | Thriller/suspense structure |

**Set default template:**

```yaml
# config.yaml
project:
  default_template: "fantasy"
```

**Override per project:**

```bash
@novel-new "My Epic" --template fantasy
```

### Auto-Save Settings

Control how and when changes are saved:

```yaml
save:
  auto_save: true          # Enable auto-save
  interval: 30             # Seconds between saves
  backup_before_write: true
  max_backups: 10          # Keep last N backups
```

**Manual save:**

```bash
@novel-save              # Save current project
@novel-save --backup     # Create backup before save
```

### Language Preferences

The plugin supports Korean and English interfaces:

```yaml
language:
  primary: "ko"           # ko | en
  output: "ko"            # Generated content language
  agent_prompts: "ko"     # Agent communication language
```

**Language-specific behavior:**

| Setting | Korean (ko) | English (en) |
|---------|-------------|--------------|
| Agent prompts | Korean instructions | English instructions |
| Template names | Korean defaults | English defaults |
| UI labels | Korean interface | English interface |

---

## Commands

### @novel-new

Start a new novel project.

```bash
@novel-new "작품명"
@novel-new "My Novel" --template fantasy
@novel-new "로맨스 소설" --path ~/Documents/novels/
```

**Options:**

| Flag | Description |
|------|-------------|
| `--template` | Use specific template |
| `--path` | Custom project directory |
| `--no-obsidian` | Skip Obsidian sync setup |

**Workflow:**

1. Prompts for project location (if not specified)
2. Creates directory structure
3. Initializes project files from template
4. Opens Director agent for initial brainstorming

### @novel-continue

Resume work on an existing project.

```bash
@novel-continue "작품명"
@novel-continue "My Novel" --agent character
@novel-continue "소설" --episode 5
```

**Options:**

| Flag | Description |
|------|-------------|
| `--agent` | Start with specific agent |
| `--episode` | Jump to specific episode |
| `--last` | Continue from last session |

**Workflow:**

1. Loads project state
2. Restores context from previous session
3. Opens Director agent with project summary

### @novel-config

Open configuration settings.

```bash
@novel-config                    # Open all settings
@novel-config obsidian           # Open Obsidian settings
@novel-config --reset            # Reset to defaults
```

**Configuration categories:**

- `general` - Language, auto-save, defaults
- `obsidian` - Vault path, sync settings
- `agents` - Agent behavior preferences
- `templates` - Template management

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
    ├── manuscript.md        # Full manuscript
    └── obsidian/            # Obsidian-formatted
        └── synced-files/
```

### Agent Definitions

```
.opencode/agents/
├── director/                # 단일 진입점
│   ├── agent.md             # Agent definition
│   └── prompts/             # Prompt templates
├── concept/                 # 기획자
├── world-builder/           # 세계관 설계사
├── character/               # 캐릭터 디자이너
├── plot/                    # 플롯 아키텍트
├── scene/                   # 장면 작가
├── dialogue/                # 대화 작가
├── critic/                  # 비평가
└── editor/                  # 편집자
```

---

## Configuration File Reference

### Full config.yaml Example

```yaml
# Oh My Novelist Configuration
# Location: ~/.config/opencode/plugins/oh-my-novelist/config.yaml

# Project settings
project:
  default_template: "default"
  default_path: "~/Documents/novels"
  naming_convention: "kebab-case"  # kebab-case | snake_case | camelCase

# Language settings
language:
  primary: "ko"
  output: "ko"
  agent_prompts: "ko"

# Save behavior
save:
  auto_save: true
  interval: 30
  backup_before_write: true
  max_backups: 10

# Obsidian integration
obsidian:
  enabled: false
  vault_path: ""
  sync_mode: "auto"
  folder_prefix: "Novels/"

# Agent preferences
agents:
  default_agent: "director"
  auto_summarize: true
  context_window: 4000

# Editor settings
editor:
  format_on_save: true
  word_wrap: true
  show_word_count: true
```

---

## Troubleshooting

### Common Issues

**Plugin not found after install:**

```bash
# Clear plugin cache
opencode plugin cache clear

# Reinstall
opencode plugin uninstall oh-my-novelist
opencode plugin install oh-my-novelist
```

**Obsidian sync not working:**

1. Verify vault path is correct
2. Check Obsidian is not running (file lock)
3. Ensure write permissions on vault folder

**Language not applying:**

```bash
# Force language setting
@novel-config language --set ko
```

### Reset Configuration

```bash
# Reset all settings to defaults
@novel-config --reset

# Or manually delete config
rm ~/.config/opencode/plugins/oh-my-novelist/config.yaml
```