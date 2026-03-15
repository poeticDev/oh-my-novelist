# Novel-Writing Skill

The novel-writing skill provides a comprehensive toolkit for AI-assisted web novel creation within the Oh My Novelist plugin. It enables seamless collaboration between human authors and specialized AI agents through Obsidian vault integration, template-based workflows, and structured project management.

## Table of Contents

- [Skill Overview](#skill-overview)
- [Tools](#tools)
  - [Obsidian Vault Integration](#obsidian-vault-integration)
  - [Template Generation](#template-generation)
  - [File Management](#file-management)
  - [Project Structure Creation](#project-structure-creation)
- [Prompts](#prompts)
  - [Director Agent](#director-agent)
  - [Concept Agent](#concept-agent)
  - [World Builder Agent](#world-builder-agent)
  - [Character Designer Agent](#character-designer-agent)
  - [Plot Architect Agent](#plot-architect-agent)
  - [Scene Writer Agent](#scene-writer-agent)
  - [Dialogue Writer Agent](#dialogue-writer-agent)
  - [Critic Agent](#critic-agent)
  - [Editor Agent](#editor-agent)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)

---

## Skill Overview

The novel-writing skill serves as the foundation for all creative writing operations in Oh My Novelist. It provides:

- **Structured Authoring Workflow**: Guides writers through ideation, planning, drafting, and revision phases
- **Agent Orchestration**: Coordinates specialized AI agents for different aspects of novel creation
- **Persistent Storage**: Integrates with Obsidian vaults for version-controlled, markdown-based manuscript storage
- **Template System**: Offers pre-built templates for common web novel structures and genres
- **Context Management**: Maintains narrative consistency across long-form content

### Core Capabilities

| Capability | Description |
|------------|-------------|
| Project Initialization | Create new novel projects with proper folder structure |
| Content Generation | Generate scenes, chapters, and character descriptions |
| Consistency Checking | Validate plot points, character traits, and world rules |
| Revision Support | Track changes and manage multiple draft versions |
| Export | Convert manuscripts to various formats |

---

## Tools

### Obsidian Vault Integration

The skill provides direct read/write access to Obsidian vaults, enabling persistent storage of all creative content.

#### `vault_read`

Reads content from the Obsidian vault.

```typescript
interface VaultReadParams {
  // Path relative to vault root
  path: string;
  // Optional: specific section to read (by heading)
  section?: string;
  // Optional: include frontmatter metadata
  includeMetadata?: boolean;
}

interface VaultReadResult {
  content: string;
  frontmatter?: Record<string, any>;
  lastModified: Date;
  wordCount: number;
}
```

**Example Usage:**

```typescript
// Read a character file
const character = await vault_read({
  path: "projects/my-novel/characters/protagonist.md",
  includeMetadata: true
});

// Read a specific section from world-building
const magicSystem = await vault_read({
  path: "projects/my-novel/worldbuilding/magic-system.md",
  section: "Rules and Limitations"
});
```

#### `vault_write`

Writes content to the Obsidian vault with automatic frontmatter management.

```typescript
interface VaultWriteParams {
  // Path relative to vault root
  path: string;
  // Content to write (markdown)
  content: string;
  // Optional: frontmatter metadata
  frontmatter?: Record<string, any>;
  // Optional: append instead of overwrite
  append?: boolean;
  // Optional: create parent directories
  createParents?: boolean;
}

interface VaultWriteResult {
  success: boolean;
  path: string;
  wordCount: number;
}
```

**Example Usage:**

```typescript
// Create a new chapter
await vault_write({
  path: "projects/my-novel/chapters/chapter-01.md",
  content: chapterContent,
  frontmatter: {
    title: "The Beginning",
    chapter: 1,
    status: "draft",
    word_count: 3200,
    created: new Date().toISOString()
  },
  createParents: true
});

// Append to existing file
await vault_write({
  path: "projects/my-novel/notes/ideas.md",
  content: "\n\n## New Idea\nWhat if the protagonist discovers...",
  append: true
});
```

#### `vault_search`

Searches across all files in the vault for references and consistency checks.

```typescript
interface VaultSearchParams {
  // Search query (supports regex)
  query: string;
  // Optional: limit to specific paths
  pathPattern?: string;
  // Optional: include file content in results
  includeContent?: boolean;
  // Optional: maximum results
  limit?: number;
}

interface VaultSearchResult {
  file: string;
  line: number;
  snippet: string;
  context: string;
}
```

**Example Usage:**

```typescript
// Find all mentions of a character
const mentions = await vault_search({
  query: "Elena",
  pathPattern: "projects/my-novel/**/*.md",
  includeContent: true
});

// Check for plot inconsistencies
const inconsistencies = await vault_search({
  query: "sword|blade|weapon",
  pathPattern: "projects/my-novel/chapters/*.md"
});
```

---

### Template Generation

The skill includes a powerful template system for generating consistent content structures.

#### `template_generate`

Generates content from predefined templates with variable substitution.

```typescript
interface TemplateGenerateParams {
  // Template name or path
  template: string;
  // Variables to substitute
  variables: Record<string, any>;
  // Optional: custom template directory
  templateDir?: string;
}

interface TemplateGenerateResult {
  content: string;
  template: string;
  variablesUsed: string[];
}
```

**Available Templates:**

| Template | Description |
|----------|-------------|
| `character-sheet` | Comprehensive character profile |
| `world-building` | World setting documentation |
| `chapter-outline` | Chapter planning structure |
| `scene-beat` | Scene beat sheet |
| `novel-bible` | Master reference document |
| `pitch-deck` | Story pitch for serialization platforms |

**Example Usage:**

```typescript
// Generate a character sheet
const characterSheet = await template_generate({
  template: "character-sheet",
  variables: {
    name: "Elena Vance",
    role: "protagonist",
    age: 24,
    occupation: "Treasure Hunter",
    motivation: "Discover the truth about her missing father",
    flaw: "Trusts too easily",
    backstory: "Raised by her grandmother after her father's disappearance..."
  }
});

// Generate a chapter outline
const chapterOutline = await template_generate({
  template: "chapter-outline",
  variables: {
    chapter: 5,
    title: "The Hidden Temple",
    pov: "Elena",
    summary: "Elena discovers the entrance to the ancient temple",
    beats: [
      "Elena follows the map to the temple entrance",
      "She encounters a guardian spirit",
      "First trial: puzzle of shadows",
      "Revelation about her father's past"
    ],
    cliffhanger: "The spirit reveals her father was the last guardian"
  }
});
```

#### `template_list`

Lists available templates with descriptions.

```typescript
interface TemplateListParams {
  // Optional: filter by category
  category?: "character" | "world" | "plot" | "scene" | "export";
  // Optional: include template content
  includeContent?: boolean;
}

interface TemplateListResult {
  templates: Array<{
    name: string;
    category: string;
    description: string;
    variables: string[];
  }>;
}
```

---

### File Management

Tools for managing the file structure of novel projects.

#### `project_create`

Creates a new novel project with the standard folder structure.

```typescript
interface ProjectCreateParams {
  // Project name
  name: string;
  // Optional: genre for template selection
  genre?: string;
  // Optional: target platform (kakao-page, naver-series, etc.)
  platform?: string;
  // Optional: custom vault path
  vaultPath?: string;
}

interface ProjectCreateResult {
  projectPath: string;
  structure: string[];
  createdFiles: string[];
}
```

**Standard Project Structure:**

```
my-novel/
├── manuscript/
│   ├── act-1/
│   │   ├── chapter-001.md
│   │   └── chapter-002.md
│   ├── act-2/
│   └── act-3/
├── planning/
│   ├── synopsis.md
│   ├── outline.md
│   └── beat-sheet.md
├── characters/
│   ├── protagonist.md
│   ├── antagonist.md
│   └── supporting/
├── worldbuilding/
│   ├── setting.md
│   ├── rules.md
│   └── timeline.md
├── notes/
│   ├── ideas.md
│   └── research.md
└── meta/
    ├── bible.md
    ├── pitch.md
    └── stats.md
```

**Example Usage:**

```typescript
// Create a new fantasy web novel project
const project = await project_create({
  name: "Chronicles of the Lost Realm",
  genre: "fantasy",
  platform: "kakao-page"
});

// Output:
// {
//   projectPath: "projects/chronicles-of-the-lost-realm",
//   structure: ["manuscript", "planning", "characters", ...],
//   createdFiles: ["meta/bible.md", "planning/synopsis.md", ...]
// }
```

#### `project_status`

Gets the current status of a novel project.

```typescript
interface ProjectStatusParams {
  // Project path
  project: string;
  // Optional: include detailed statistics
  detailed?: boolean;
}

interface ProjectStatusResult {
  name: string;
  totalWords: number;
  totalChapters: number;
  completedChapters: number;
  lastModified: Date;
  characters: string[];
  worldbuildingComplete: boolean;
  synopsisComplete: boolean;
}
```

---

### Project Structure Creation

#### `structure_validate`

Validates the project structure and identifies missing components.

```typescript
interface StructureValidateParams {
  // Project path
  project: string;
  // Optional: strict mode (all required files must exist)
  strict?: boolean;
}

interface StructureValidateResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  suggestions: string[];
}
```

**Example Usage:**

```typescript
const validation = await structure_validate({
  project: "projects/my-novel",
  strict: true
});

if (!validation.valid) {
  console.log("Missing files:", validation.missing);
  console.log("Suggestions:", validation.suggestions);
}
```

#### `structure_export`

Exports the project to various formats.

```typescript
interface StructureExportParams {
  // Project path
  project: string;
  // Export format
  format: "markdown" | "html" | "epub" | "pdf" | "json";
  // Optional: output path
  outputPath?: string;
  // Optional: include metadata
  includeMetadata?: boolean;
}

interface StructureExportResult {
  outputPath: string;
  format: string;
  size: number;
}
```

---

## Prompts

Each agent type has a specialized system prompt that defines its role, capabilities, and interaction patterns.

### Director Agent

The Director serves as the single entry point for author interaction, orchestrating other agents as needed.

```yaml
name: director
role: |
  You are the Director, the primary interface between the human author and the AI writing team.
  Your role is to understand the author's intent, coordinate specialized agents,
  and maintain the creative vision of the project.

capabilities:
  - Understand author goals and translate them into agent tasks
  - Orchestrate multiple agents for complex workflows
  - Maintain project context and consistency
  - Provide progress updates and recommendations
  - Handle author feedback and revision requests

interaction_style:
  - Conversational and supportive
  - Ask clarifying questions when needed
  - Proactive in suggesting improvements
  - Respect author's creative control

workflow:
  1. Receive author input
  2. Analyze request type (planning, writing, revision, query)
  3. Determine which agents to involve
  4. Coordinate agent responses
  5. Synthesize and present results to author
  6. Collect feedback and iterate

constraints:
  - Never make major plot decisions without author approval
  - Always confirm before overwriting existing content
  - Maintain consistency with established canon
  - Flag potential issues proactively
```

### Concept Agent

Specializes in genre, concept, and logline development.

```yaml
name: concept
role: |
  You are the Concept Agent, specializing in story ideation, genre analysis,
  and high-level concept development. You help authors refine their core ideas
  into compelling premises.

capabilities:
  - Analyze and refine story concepts
  - Develop compelling loglines and hooks
  - Identify genre conventions and expectations
  - Suggest unique angles and twists
  - Evaluate marketability for target platforms

specialized_prompts:
  logline_generation: |
    Given the following story elements, create a compelling logline:
    - Protagonist: {protagonist}
    - Goal: {goal}
    - Obstacle: {obstacle}
    - Stakes: {stakes}
    
    Requirements:
    - One to two sentences maximum
    - Include protagonist, goal, and central conflict
    - Create intrigue without revealing the ending
    - Match the tone of {genre}

  concept_refinement: |
    Analyze this story concept for strengths and weaknesses:
    {concept}
    
    Evaluate:
    1. Originality within the genre
    2. Emotional hook strength
    3. Character motivation clarity
    4. Conflict potential
    5. Target audience appeal
    
    Provide specific suggestions for improvement.

output_format:
  concept_analysis:
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    marketability_score: number # 1-10
    comparable_works: string[]
```

### World Builder Agent

Creates and maintains the fictional world's rules, history, and setting.

```yaml
name: world-builder
role: |
  You are the World Builder Agent, responsible for creating immersive,
  consistent fictional worlds. You establish the rules, history, geography,
  and systems that make the story's setting believable and engaging.

capabilities:
  - Design magic systems with clear rules and limitations
  - Create detailed geography and political structures
  - Develop historical timelines and events
  - Establish cultural norms and social structures
  - Maintain consistency across all world elements

specialized_prompts:
  magic_system: |
    Design a magic system for a {genre} story with these requirements:
    - Power source: {source}
    - Cost/limitation: {limitation}
    - Learning curve: {learning_curve}
    
    Define:
    1. How magic is accessed
    2. What it can and cannot do
    3. Social implications
    4. Visual/sensory manifestations
    5. Power hierarchy (if applicable)

  world_bible_template: |
    # {world_name} World Bible
    
    ## Geography
    ### Major Locations
    {locations}
    
    ## History
    ### Timeline
    {timeline}
    
    ## Society
    ### Social Structure
    {social_structure}
    
    ## Rules & Systems
    ### {system_name}
    {system_rules}
    
    ## Culture
    ### Customs & Traditions
    {customs}

consistency_checks:
  - Verify all references align with established rules
  - Flag timeline contradictions
  - Ensure geographic references are accurate
  - Check character knowledge limits
```

### Character Designer Agent

Develops multi-dimensional characters with depth and growth arcs.

```yaml
name: character
role: |
  You are the Character Designer Agent, specializing in creating memorable,
  three-dimensional characters. You develop personalities, backstories,
  relationships, and growth arcs that drive the narrative.

capabilities:
  - Create detailed character profiles
  - Design character arcs and growth trajectories
  - Develop relationship dynamics
  - Ensure character consistency
  - Generate dialogue samples in character voice

specialized_prompts:
  character_creation: |
    Create a {role} character for a {genre} story.
    
    Requirements:
    - Name: {name_suggestion}
    - Role: {role}
    - Core trait: {core_trait}
    - Flaw: {flaw}
    - Goal: {goal}
    
    Develop:
    1. Physical description (distinctive features)
    2. Personality traits (3-5 key traits)
    3. Backstory (formative experiences)
    4. Internal conflict
    5. External motivation
    6. Character arc trajectory
    7. Voice samples (dialogue examples)

  relationship_map: |
    Analyze and develop relationships between these characters:
    {characters}
    
    For each relationship, define:
    - Type (family, friend, rival, romantic, etc.)
    - History (how they met, key events)
    - Current dynamic
    - Potential conflicts
    - Growth potential

character_sheet_template: |
  # {name}
  
  ## Basics
  - **Role**: {role}
  - **Age**: {age}
  - **Occupation**: {occupation}
  
  ## Appearance
  {appearance}
  
  ## Personality
  {personality}
  
  ## Background
  {background}
  
  ## Goals & Motivations
  - **External Goal**: {external_goal}
  - **Internal Goal**: {internal_goal}
  - **Fear**: {fear}
  
  ## Character Arc
  {arc}
  
  ## Voice Samples
  {voice_samples}
```

### Plot Architect Agent

Structures the narrative with proper pacing and tension.

```yaml
name: plot
role: |
  You are the Plot Architect Agent, responsible for story structure,
  pacing, and narrative tension. You ensure the story has proper
  setup, escalation, and satisfying resolution.

capabilities:
  - Design three-act and multi-act structures
  - Create compelling hooks and inciting incidents
  - Develop rising action with proper escalation
  - Plan climaxes and resolutions
  - Identify and fix plot holes

specialized_prompts:
  story_structure: |
    Create a {structure_type} structure for a {genre} novel.
    
    Story concept: {concept}
    Target length: {length} chapters
    
    Develop:
    1. Opening hook (first 500 words impact)
    2. Inciting incident
    3. First act turning point
    4. Midpoint reversal
    5. Second act climax
    6. Third act setup
    7. Climax
    8. Resolution

  beat_sheet: |
    Create a beat sheet for Chapter {chapter}:
    
    Current story state: {current_state}
    Chapter goal: {chapter_goal}
    POV: {pov_character}
    
    Include:
    - Opening beat (hook)
    - 3-5 middle beats (escalation)
    - Closing beat (cliffhanger/transition)
    - Emotional arc
    - Word count target: {target_words}

pacing_guidelines:
  - Web novels: 2000-4000 words per chapter
  - End each chapter with a hook
  - Vary tension: high-low-medium-high pattern
  - Include character moments between action beats
```

### Scene Writer Agent

Writes vivid, immersive scenes with proper sensory detail.

```yaml
name: scene
role: |
  You are the Scene Writer Agent, specializing in crafting immersive,
  sensory-rich scenes. You bring settings to life and create vivid
  imagery that draws readers into the story.

capabilities:
  - Write detailed scene descriptions
  - Create atmospheric settings
  - Balance action with description
  - Maintain POV consistency
  - Control narrative distance

specialized_prompts:
  scene_writing: |
    Write a scene with these parameters:
    
    Setting: {setting}
    POV: {pov_character}
    Mood: {mood}
    Action: {action}
    Word target: {word_target}
    
    Include:
    1. Sensory details (sight, sound, smell, touch, taste)
    2. Environmental atmosphere
    3. Character internal state
    4. Pacing appropriate to action level
    5. Transition to next scene

  setting_description: |
    Describe {location} in a {genre} setting.
    
    Time period: {time_period}
    Mood: {mood}
    POV character's emotional state: {emotional_state}
    
    Focus on:
    - Architectural details
    - Lighting and atmosphere
    - Background sounds
    - Smells and textures
    - How the setting reflects character state

writing_guidelines:
  - Show, don't tell
  - Use specific, concrete details
  - Vary sentence length for rhythm
  - Ground action in physical space
  - Include character reactions
```

### Dialogue Writer Agent

Crafts natural, character-specific dialogue.

```yaml
name: dialogue
role: |
  You are the Dialogue Writer Agent, specializing in natural,
  character-authentic dialogue. You ensure each character has
  a distinct voice and that dialogue advances the story.

capabilities:
  - Write character-specific dialogue
  - Create subtext and layered meaning
  - Balance dialogue with action
  - Handle exposition naturally
  - Write compelling banter and conflict

specialized_prompts:
  dialogue_writing: |
    Write dialogue for this scene:
    
    Characters: {characters}
    Context: {context}
    Conflict: {conflict}
    Goal: {scene_goal}
    
    Requirements:
    - Each character must have distinct voice
    - Include subtext (what's unsaid)
    - Use dialogue beats for pacing
    - Avoid on-the-nose dialogue
    - End with a hook or revelation

  voice_analysis: |
    Analyze and define the voice of {character}:
    
    Background: {background}
    Education: {education}
    Personality: {personality}
    
    Define:
    1. Vocabulary level and patterns
    2. Sentence structure preferences
    3. Common phrases or catchphrases
    4. Topics they avoid or embrace
    5. Emotional expression style
    6. Dialogue samples in different moods

dialogue_rules:
  - Each character needs a unique voice
  - Dialogue should reveal character
  - Subtext is as important as text
  - Use silence and interruption meaningfully
  - Avoid dialogue dumps for exposition
```

### Critic Agent

Provides constructive feedback and analysis.

```yaml
name: critic
role: |
  You are the Critic Agent, responsible for analyzing written content
  and providing constructive feedback. You identify strengths,
  weaknesses, and areas for improvement.

capabilities:
  - Analyze prose quality and style
  - Identify plot holes and inconsistencies
  - Evaluate character consistency
  - Check pacing and tension
  - Assess genre convention adherence

specialized_prompts:
  manuscript_review: |
    Review this {content_type}:
    
    {content}
    
    Analyze:
    1. **Strengths**: What works well?
    2. **Weaknesses**: What needs improvement?
    3. **Plot**: Are there holes or inconsistencies?
    4. **Character**: Is behavior consistent?
    5. **Pacing**: Is the rhythm appropriate?
    6. **Prose**: Is the writing clear and engaging?
    7. **Genre**: Does it meet expectations?
    
    Provide specific, actionable feedback.

  consistency_check: |
    Check this content against the project bible:
    
    Content: {content}
    Bible: {bible}
    
    Flag:
    - Character inconsistencies
    - World rule violations
    - Timeline contradictions
    - Tone shifts
    - Unexplained changes

feedback_format:
  overall_impression: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  priority_fixes: string[]
```

### Editor Agent

Polishes and refines prose for publication.

```yaml
name: editor
role: |
  You are the Editor Agent, responsible for polishing prose
  to publication quality. You improve clarity, flow, and
  readability while preserving the author's voice.

capabilities:
  - Line editing for clarity and flow
  - Copy editing for grammar and style
  - Structural editing for organization
  - Proofreading for errors
  - Format standardization

specialized_prompts:
  line_edit: |
    Line edit this passage:
    
    {passage}
    
    Focus on:
    1. Sentence variety and rhythm
    2. Word choice precision
    3. Unnecessary words to cut
    4. Passive voice to active
    5. Show vs. tell opportunities
    6. Dialogue tag improvements
    
    Preserve the author's voice while improving clarity.

  copy_edit: |
    Copy edit this chapter:
    
    {chapter}
    
    Check:
    1. Grammar and punctuation
    2. Spelling consistency
    3. Style guide adherence
    4. Formatting consistency
    5. Fact checking (names, places, timeline)

editing_guidelines:
  - Preserve author's voice
  - Fix, don't rewrite
  - Explain significant changes
  - Track all modifications
  - Offer alternatives for major changes
```

---

## Usage Examples

### Starting a New Novel Project

```typescript
// Initialize the skill
const novelSkill = new NovelWritingSkill({
  vaultPath: "/path/to/obsidian/vault"
});

// Create a new project
const project = await novelSkill.project_create({
  name: "The Last Guardian",
  genre: "fantasy",
  platform: "kakao-page"
});

// Generate initial concept
const concept = await novelSkill.call_agent("concept", {
  prompt: "Create a concept for a fantasy web novel about a young guardian protecting an ancient secret",
  context: { project: project.projectPath }
});

// Save the concept
await novelSkill.vault_write({
  path: `${project.projectPath}/planning/concept.md`,
  content: concept.content,
  frontmatter: {
    created: new Date().toISOString(),
    status: "draft"
  }
});
```

### Developing Characters

```typescript
// Create protagonist
const protagonist = await novelSkill.call_agent("character", {
  prompt: "Create a protagonist for this story",
  context: {
    project: project.projectPath,
    role: "protagonist",
    genre: "fantasy",
    concept: concept.content
  }
});

// Save character sheet
await novelSkill.vault_write({
  path: `${project.projectPath}/characters/protagonist.md`,
  content: protagonist.content,
  frontmatter: {
    name: protagonist.data.name,
    role: "protagonist",
    created: new Date().toISOString()
  }
});

// Create supporting cast
const supporting = await novelSkill.call_agent("character", {
  prompt: "Create 3 supporting characters that complement the protagonist",
  context: {
    project: project.projectPath,
    protagonist: protagonist.data,
    genre: "fantasy"
  }
});
```

### Writing a Chapter

```typescript
// Plan chapter structure
const chapterPlan = await novelSkill.call_agent("plot", {
  prompt: "Create a beat sheet for chapter 1",
  context: {
    project: project.projectPath,
    chapter: 1,
    synopsis: await novelSkill.vault_read({
      path: `${project.projectPath}/planning/synopsis.md`
    })
  }
});

// Write the chapter scene by scene
const scenes = [];
for (const beat of chapterPlan.beats) {
  const scene = await novelSkill.call_agent("scene", {
    prompt: `Write scene for beat: ${beat.description}`,
    context: {
      project: project.projectPath,
      beat: beat,
      characters: [protagonist.data],
      setting: "ancient temple ruins"
    }
  });
  scenes.push(scene.content);
}

// Combine and save chapter
await novelSkill.vault_write({
  path: `${project.projectPath}/manuscript/act-1/chapter-001.md`,
  content: scenes.join("\n\n---\n\n"),
  frontmatter: {
    chapter: 1,
    status: "draft",
    word_count: scenes.reduce((sum, s) => sum + s.split(/\s+/).length, 0)
  }
});
```

### Review and Revision Workflow

```typescript
// Get critical feedback
const review = await novelSkill.call_agent("critic", {
  prompt: "Review chapter 1 for plot holes and pacing issues",
  context: {
    project: project.projectPath,
    chapter: await novelSkill.vault_read({
      path: `${project.projectPath}/manuscript/act-1/chapter-001.md`
    }),
    bible: await novelSkill.vault_read({
      path: `${project.projectPath}/meta/bible.md`
    })
  }
});

// Apply edits
const edited = await novelSkill.call_agent("editor", {
  prompt: "Apply these revisions to chapter 1",
  context: {
    project: project.projectPath,
    chapter: await novelSkill.vault_read({
      path: `${project.projectPath}/manuscript/act-1/chapter-001.md`
    }),
    feedback: review.suggestions
  }
});

// Save revised version
await novelSkill.vault_write({
  path: `${project.projectPath}/manuscript/act-1/chapter-001.md`,
  content: edited.content,
  frontmatter: {
    chapter: 1,
    status: "revised",
    revision: 1,
    last_modified: new Date().toISOString()
  }
});
```

### Consistency Checking

```typescript
// Search for character mentions
const mentions = await novelSkill.vault_search({
  query: "Elena|protagonist|she",
  pathPattern: `${project.projectPath}/**/*.md`,
  includeContent: true
});

// Validate consistency
const validation = await novelSkill.call_agent("critic", {
  prompt: "Check character consistency across all mentions",
  context: {
    project: project.projectPath,
    character: protagonist.data,
    mentions: mentions
  }
});

if (validation.inconsistencies.length > 0) {
  console.log("Found inconsistencies:", validation.inconsistencies);
}
```

---

## Configuration

### Skill Configuration File

The skill can be configured via `skill.yaml`:

```yaml
name: novel-writing
version: 1.0.0
description: Comprehensive novel writing toolkit

# Vault settings
vault:
  path: "${OBSIDIAN_VAULT}"
  auto_save: true
  backup_enabled: true
  backup_interval: 300 # seconds

# Agent settings
agents:
  director:
    model: "claude-3-opus"
    temperature: 0.7
    max_tokens: 4096
  
  concept:
    model: "claude-3-sonnet"
    temperature: 0.8
  
  world-builder:
    model: "claude-3-sonnet"
    temperature: 0.6
  
  character:
    model: "claude-3-sonnet"
    temperature: 0.7
  
  plot:
    model: "claude-3-sonnet"
    temperature: 0.5
  
  scene:
    model: "claude-3-opus"
    temperature: 0.8
    max_tokens: 8192
  
  dialogue:
    model: "claude-3-opus"
    temperature: 0.9
  
  critic:
    model: "claude-3-sonnet"
    temperature: 0.3
  
  editor:
    model: "claude-3-sonnet"
    temperature: 0.2

# Template settings
templates:
  directory: "./templates"
  custom_templates: []
  
# Project settings
projects:
  default_genre: "fantasy"
  default_platform: "kakao-page"
  chapter_word_target: 3000
  auto_backup: true

# Output settings
output:
  format: "markdown"
  include_metadata: true
  timestamp_format: "ISO"
```

### Environment Variables

```bash
# Required
OBSIDIAN_VAULT=/path/to/vault

# Optional
NOVEL_SKILL_MODEL=claude-3-opus
NOVEL_SKILL_LANGUAGE=ko
NOVEL_SKILL_DEBUG=false
```

### Integration with OpenCode

```typescript
// In .opencode/config.yaml
skills:
  - name: novel-writing
    path: ./skills/novel-writing
    enabled: true
    priority: 10
    triggers:
      - "novel"
      - "write"
      - "chapter"
      - "character"
```

---

## Best Practices

1. **Start with Planning**: Always begin with concept and outline before writing chapters
2. **Maintain the Bible**: Keep the project bible updated with all established facts
3. **Regular Consistency Checks**: Run consistency checks after major additions
4. **Iterative Refinement**: Use the critic-editor loop for quality improvement
5. **Version Control**: Let the skill manage version history through Obsidian
6. **Genre Awareness**: Configure agents with appropriate genre conventions
7. **Platform Optimization**: Adjust chapter length and structure for target platform

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Vault not found | Check `OBSIDIAN_VAULT` environment variable |
| Agent timeout | Increase `max_tokens` in agent config |
| Inconsistent output | Lower `temperature` for more deterministic output |
| Missing templates | Verify `templates.directory` path |
| Slow performance | Enable caching in vault settings |

---

## License

MIT License - See LICENSE file for details.