# LLM Integration Rollout for oh-my-novelist

## TL;DR
> **Summary**: Add an Anthropic-first LLM runtime to the existing plugin without forking oh-my-openagent, preserving current routing semantics while introducing a shared prompt pipeline, plugin-scoped context service, and resilient fallback behavior.
> **Deliverables**:
> - Shared LLM core under `src/llm/`
> - Prompt loading/building pipeline under `src/prompts/`
> - Plugin-scoped `ContextManager`
> - Director/BaseAgent/index wiring updates
> - Concept MVP first, then staged rollout to remaining agents
> - Minimal automated test harness and smoke verification
> **Effort**: Large
> **Parallel**: YES - 5 waves
> **Critical Path**: Task 1 → Task 2 → Task 3/4/5 → Task 6 → Task 7 → Task 8/9 → Task 10

## Context
### Original Request
Review `docs/LLM_INTEGRATION_PLAN_FINAL.md` and produce a concrete, realistic implementation plan grounded in the actual repository.

### Interview Summary
- The design doc has evolved through multiple review rounds but still overreaches in places.
- The repository currently has static agents, prompt markdown assets, persistent state/todo storage, and no real LLM/runtime layer.
- The most feasible path is to extend the current codebase, not fork oh-my-openagent.

### Metis Review (gaps addressed)
- Reduce MVP scope to Concept-first, not “all major agents at once”.
- Add a real test harness before changing agent contracts.
- Make prompt asset loading an explicit build/runtime decision.
- Keep `ContextManager` plugin-scoped and memory-first.
- Defer chain orchestration, streaming, and multi-provider support.

## Work Objectives
### Core Objective
Implement a production-feasible, Anthropic-first LLM integration that upgrades the current static plugin into a resilient, testable runtime while minimizing architectural risk.

### Deliverables
- `src/llm/types.ts`, `src/llm/chains.ts`, `src/llm/anthropic-client.ts`, `src/llm/factory.ts`
- `src/prompts/types.ts`, `src/prompts/loader.ts`, `src/prompts/builder.ts`
- `src/context/manager.ts`
- Updated `src/agents/base.ts`, `src/agents/director.ts`, `src/index.ts`
- Migrated `src/agents/concept.ts` first, then remaining agent files in staged waves
- Test runner, tests, and runtime smoke checks

### Definition of Done (verifiable conditions with commands)
- `npm run typecheck` exits with code 0.
- `npm run build` exits with code 0.
- `npm test` exits with code 0 after adding the new harness.
- `@concept` uses LLM generation when Anthropic is available and returns a non-empty static fallback when it is not.
- Director’s existing non-specialist flows still return non-error responses.

### Must Have
- Anthropic-only provider in the first implementation pass
- Runtime fallback behavior: primary model → secondary model → static fallback
- Plugin-scoped `ContextManager`
- Prompt asset strategy that works after build output exists
- File-by-file rollout order with explicit non-goals

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No fork of oh-my-openagent
- No multi-provider runtime in MVP
- No streaming in MVP
- No Director chain engine in MVP
- No refactor of unrelated dead utilities (`src/utils/intent-parser.ts`, `src/utils/categories.ts`) beyond compatibility shims or documented bypasses
- No new persisted canon/session-summary/agent-memory files in MVP unless needed by a later approved phase

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: **TDD** with a lightweight Node-compatible runner (Vitest) added in Task 1
- QA policy: Every task includes executable checks plus one failure/degradation scenario
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Shared-core tasks are intentionally front-loaded; rollout parallelism begins only after contracts, prompt pipeline, context lifecycle, and resilient fallback are stable.

Wave 1: Task 1-2 (test harness + canonical contracts)

Wave 2: Task 3-5 (prompt pipeline, context lifecycle, Anthropic runtime)

Wave 3: Task 6-7 (plugin wiring + Concept MVP)

Wave 4: Task 8-9 (planning agents, then drafting/review agents)

Wave 5: Task 10 (stabilization and release readiness)

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 | None | 2-10 |
| 2 | 1 | 3-10 |
| 3 | 2 | 6-10 |
| 4 | 2 | 6-10 |
| 5 | 2 | 6-10 |
| 6 | 3,4,5 | 7-10 |
| 7 | 6 | 8-10 |
| 8 | 7 | 10 |
| 9 | 7 | 10 |
| 10 | 8,9 | F1-F4 |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → quick / unspecified-high
- Wave 2 → 3 tasks → unspecified-high
- Wave 3 → 2 tasks → unspecified-high
- Wave 4 → 2 tasks → unspecified-high / writing
- Wave 5 → 1 task → unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add a real test harness and baseline failing specs

  **What to do**: Add a lightweight Node-compatible test runner and wire it into `package.json` so the repo has a stable automated verification entrypoint before any contract changes land. Create the first failing tests for fallback resolution, prompt loading, prompt building, context isolation, and offline degradation so every later task can proceed TDD-first.
  **Must NOT do**: Do not add browser/E2E frameworks, snapshot-heavy tests, or integration tests that require the real Anthropic API.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: bounded repo-wide infra change with small file set
  - Skills: `[]` — no special skill required
  - Omitted: `['playwright']` — no browser surface exists

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5,6,7,8,9,10 | Blocked By: none

  **References**:
  - Pattern: `package.json` — current scripts include `build`, `typecheck`, and a failing placeholder `test`
  - Pattern: `tsconfig.json` — current compiler baseline the tests must coexist with
  - Test: `docs/LLM_INTEGRATION_PLAN_FINAL.md` — existing LLM contracts and degradation expectations to convert into tests

  **Acceptance Criteria**:
  - [ ] `package.json` exposes a real `test` script that exits 0 once tests pass.
  - [ ] The repo contains failing-first unit tests for resolver, prompt loader/builder, context isolation, and offline fallback behavior.
  - [ ] `npm test` can run without requiring real API credentials.

  **QA Scenarios**:
  ```
  Scenario: Test harness executes real unit suite
    Tool: Bash
    Steps: run `npm test`
    Expected: runner starts, discovers new test files, and exits 0 after implementation for this task is complete
    Evidence: .sisyphus/evidence/task-1-test-harness.txt

  Scenario: Missing API key does not break tests
    Tool: Bash
    Steps: run `ANTHROPIC_API_KEY='' npm test`
    Expected: tests covering offline behavior still pass and no suite requires live network credentials
    Evidence: .sisyphus/evidence/task-1-test-harness-offline.txt
  ```

  **Commit**: YES | Message: `test(llm): add harness and baseline specs` | Files: `package.json`, test files, optional test config

- [ ] 2. Introduce canonical shared LLM/runtime contracts

  **What to do**: Create the shared type system under `src/llm/` and update the plan’s conceptual contracts into code-ready definitions. Define one canonical `NovelContext`, one canonical `AgentType`, category parameters separate from fallback candidates, and a minimal `LLMResponse` shape that includes degradation state. Keep this task contract-only; do not implement provider calls here.
  **Must NOT do**: Do not retrofit `src/utils/categories.ts` into the new runtime, do not add multi-provider abstractions beyond what Anthropic-first MVP needs, and do not add persisted canon/session files yet.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: contract design affects all later files
  - Skills: `[]` — straightforward architecture work after research
  - Omitted: `['frontend-ui-ux']` — no UI work involved

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3,4,5,6,7,8,9,10 | Blocked By: 1

  **References**:
  - Pattern: `src/agents/base.ts` — current minimal agent contract to replace
  - Pattern: `src/agents/director.ts` — existing routing surface that will receive the shared context
  - Pattern: `src/utils/categories.ts` — existing category helper to bypass rather than expand in MVP
  - API/Type: `docs/LLM_INTEGRATION_PLAN_FINAL.md` — 4-stage `NovelContext`, category/fallback separation, degradation model

  **Acceptance Criteria**:
  - [ ] `src/llm/types.ts` defines `AgentType`, `NovelContext`, `GenerationParams`, `ModelCandidate`, and `LLMResponse` as the only shared runtime contract set.
  - [ ] `src/llm/chains.ts` maps agent → category params and agent → fallback candidates without assigning models inside category config.
  - [ ] Type-level tests or unit tests verify that category params and fallback candidates are resolved independently.

  **QA Scenarios**:
  ```
  Scenario: Shared contracts typecheck cleanly
    Tool: Bash
    Steps: run `npm run typecheck`
    Expected: new llm contract files compile with no type errors and no duplicate conflicting context definitions remain in code
    Evidence: .sisyphus/evidence/task-2-contracts-typecheck.txt

  Scenario: Category params and fallback order stay separate
    Tool: Bash
    Steps: run `npx vitest run src/llm/**/*.test.ts`
    Expected: tests prove category affects generation params only, while fallback chains affect candidate order only
    Evidence: .sisyphus/evidence/task-2-contracts-tests.txt
  ```

  **Commit**: YES | Message: `feat(llm): add canonical runtime contracts` | Files: `src/llm/types.ts`, `src/llm/chains.ts`, related tests

- [ ] 3. Implement prompt asset strategy and prompt pipeline

  **What to do**: Decide and implement the runtime-safe prompt asset strategy, then add `PromptLoader`, `PromptBuilder`, and prompt types. The decision for this repo is: keep prompt sources in `src/agents/prompts/*.md`, copy them into build output during build, and make the loader prefer build-relative assets with a source-tree fallback for local development. `PromptBuilder` must compose scaffold + agent instructions + user input; the provider client must not build prompts.
  **Must NOT do**: Do not leave `process.cwd()/src/...` as the sole runtime path, do not duplicate file-loading logic inside the builder, and do not introduce Handlebars-style templating in MVP.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: asset-path and prompt responsibilities are a repo-specific risk
  - Skills: `[]` — no special skill required
  - Omitted: `['dev-browser']` — no browser interaction needed

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6,7,8,9,10 | Blocked By: 2

  **References**:
  - Pattern: `src/agents/prompts/*.md` — existing reusable instruction assets
  - Pattern: `package.json` — build script to extend with prompt-copy behavior
  - Pattern: `docs/LLM_INTEGRATION_PLAN_FINAL.md` — scaffold/builder separation and runtime asset-loading risk

  **Acceptance Criteria**:
  - [ ] `src/prompts/types.ts`, `src/prompts/loader.ts`, and `src/prompts/builder.ts` exist and reflect Loader → Builder → Client separation.
  - [ ] Build output contains the prompt markdown assets needed at runtime.
  - [ ] Prompt-loading tests pass in both source-tree and built-output resolution modes.

  **QA Scenarios**:
  ```
  Scenario: Prompt pipeline works in source tree
    Tool: Bash
    Steps: run `npx vitest run src/prompts/**/*.test.ts`
    Expected: loader caches prompts, builder composes scaffold + instructions, and tests exit 0
    Evidence: .sisyphus/evidence/task-3-prompt-pipeline.txt

  Scenario: Built output still resolves prompt assets
    Tool: Bash
    Steps: run `npm run build && npx vitest run src/prompts/**/*.test.ts --reporter=basic`
    Expected: build succeeds and asset-resolution tests prove prompt files remain loadable after build preparation
    Evidence: .sisyphus/evidence/task-3-prompt-build-assets.txt
  ```

  **Commit**: YES | Message: `feat(prompts): add runtime-safe prompt pipeline` | Files: `src/prompts/*`, prompt copy/build helper, prompt tests, build script updates

- [ ] 4. Implement a plugin-scoped ContextManager using existing persisted state/todos

  **What to do**: Add `src/context/manager.ts` as a plugin-scoped service that assembles runtime `NovelContext` from what the repo already persists today: `ProjectState` and todo files. Keep `canon` as a runtime adaptation layer over current project/todo data plus empty narrative arrays, and keep `sessionSummary`, `agentMemory`, and `recentConversation` memory-only for MVP. Record turns per project key to prevent context bleed across projects.
  **Must NOT do**: Do not invent new persisted canon/memory/session files in MVP, do not instantiate a new manager inside agents, and do not load every historical turn into the prompt.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: lifecycle and isolation semantics are core runtime behavior
  - Skills: `[]` — no specialized skill required
  - Omitted: `['playwright']` — not a UI task

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6,7,8,9,10 | Blocked By: 2

  **References**:
  - Pattern: `src/utils/state.ts` — existing persisted project/session state
  - Pattern: `src/tools/todo-manager.ts` — existing persisted todo infrastructure
  - Pattern: `src/index.ts` — plugin entry point that should own the singleton service lifecycle
  - API/Type: `.sisyphus/drafts/llm-integration-concrete-plan.md` — scope decision to keep memory-first context

  **Acceptance Criteria**:
  - [ ] `ContextManager.build(agentType, projectName)` returns the canonical `NovelContext` shape.
  - [ ] Conversation history is isolated per project key and truncated to the configured recent-turn window.
  - [ ] No agent directly constructs its own `ContextManager`.

  **QA Scenarios**:
  ```
  Scenario: Context assembly uses existing state and todo data
    Tool: Bash
    Steps: run `npx vitest run src/context/**/*.test.ts`
    Expected: tests confirm canon derives from existing project/todo data and returns empty-safe values when no project is active
    Evidence: .sisyphus/evidence/task-4-context-manager.txt

  Scenario: Project isolation prevents context bleed
    Tool: Bash
    Steps: run `npx vitest run src/context/**/*.test.ts -t "project isolation"`
    Expected: turns recorded for project A never appear in project B context output
    Evidence: .sisyphus/evidence/task-4-context-isolation.txt
  ```

  **Commit**: YES | Message: `feat(context): add plugin scoped novelist context manager` | Files: `src/context/manager.ts`, context tests, any small helper types

- [ ] 5. Implement Anthropic provider runtime and resilient fallback traversal

  **What to do**: Implement the Anthropic provider adapter plus a resilient runtime client that resolves generation params and fallback candidates by agent type at execution time. The runtime must try the first candidate, then the next candidate on provider/model failure, and only then degrade to offline static fallback. Keep provider support Anthropic-only in this task; expose the runtime behind a single client interface used by all migrated agents.
  **Must NOT do**: Do not add OpenAI/OpenCode clients, do not perform static fallback directly inside the provider client, and do not hide degradation state from callers.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: external runtime integration plus failure-mode handling
  - Skills: `[]` — no special skill required
  - Omitted: `['git-master']` — implementation planning only, no git work needed in the task itself

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6,7,8,9,10 | Blocked By: 2

  **References**:
  - Pattern: `package.json` — dependency/scripts baseline
  - Pattern: `.opencode/config.yaml` — model naming examples already present in the workspace
  - API/Type: `src/llm/types.ts`, `src/llm/chains.ts` — contracts defined in Task 2
  - External: `https://github.com/anthropics/anthropic-sdk-typescript` — provider SDK reference

  **Acceptance Criteria**:
  - [ ] `src/llm/anthropic-client.ts` implements the provider adapter against the shared runtime contract.
  - [ ] `src/llm/factory.ts` returns one resilient client that performs runtime fallback traversal.
  - [ ] Unit tests cover no-key, thrown-provider-error, and successful secondary-candidate fallback behavior.

  **QA Scenarios**:
  ```
  Scenario: Primary candidate failure triggers secondary fallback
    Tool: Bash
    Steps: run `npx vitest run src/llm/**/*.test.ts -t "fallback traversal"`
    Expected: tests show first candidate failure, second candidate attempt, and `degradation` marked as `reduced`
    Evidence: .sisyphus/evidence/task-5-fallback-traversal.txt

  Scenario: No Anthropic key degrades to offline mode safely
    Tool: Bash
    Steps: run `ANTHROPIC_API_KEY='' npx vitest run src/llm/**/*.test.ts -t "offline fallback"`
    Expected: runtime returns `degradation: offline` without throwing and leaves final static fallback to the agent layer
    Evidence: .sisyphus/evidence/task-5-offline-fallback.txt
  ```

  **Commit**: YES | Message: `feat(llm): add anthropic runtime and fallback traversal` | Files: `src/llm/anthropic-client.ts`, `src/llm/factory.ts`, `src/llm/chains.ts`, LLM tests, dependency updates

- [ ] 6. Wire AgentContext through `base.ts`, `director.ts`, and `index.ts`

  **What to do**: Update the shared agent contract so migrated agents receive one injected `AgentContext` containing `directory`, plugin-scoped `ContextManager`, and the resilient LLM client. Initialize those shared services once in `src/index.ts`, preserve Director’s current routing semantics, and pass the same context object through delegation so migrated agents can use the shared core without per-agent construction.
  **Must NOT do**: Do not redesign Director’s intent behavior, do not add multi-agent chain orchestration in MVP, and do not keep mixed old/new `handle()` signatures alive after this task lands.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: central wiring affects every later migration
  - Skills: `[]` — standard repo integration work
  - Omitted: `['artistry']` — conventional wiring, not a novel solution search

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 7,8,9,10 | Blocked By: 3,4,5

  **References**:
  - Pattern: `src/index.ts` — current plugin entrypoint and `chat.message` hook
  - Pattern: `src/agents/base.ts` — current minimal agent interface
  - Pattern: `src/agents/director.ts` — current delegation/routing semantics to preserve

  **Acceptance Criteria**:
  - [ ] `BaseAgent` and `AgentContext` are updated once, and all migrated call sites compile against the new signature.
  - [ ] `src/index.ts` creates exactly one `ContextManager` and one resilient LLM client for plugin lifetime use.
  - [ ] Existing Director basics (`안녕`, `상태`, direct mentions) still route without throwing.

  **QA Scenarios**:
  ```
  Scenario: Wiring compiles across plugin entry and Director delegation
    Tool: Bash
    Steps: run `npm run typecheck && npm run build`
    Expected: no signature mismatch errors remain in `base.ts`, `director.ts`, or `index.ts`
    Evidence: .sisyphus/evidence/task-6-wiring-build.txt

  Scenario: Director regression surface remains safe
    Tool: Bash
    Steps: run `npx vitest run src/agents/**/*.test.ts -t "director routing"`
    Expected: tests confirm direct specialist routing still works and non-specialist paths still return non-empty text
    Evidence: .sisyphus/evidence/task-6-director-routing.txt
  ```

  **Commit**: YES | Message: `feat(runtime): inject shared agent context through plugin wiring` | Files: `src/index.ts`, `src/agents/base.ts`, `src/agents/director.ts`, wiring tests

- [ ] 7. Migrate `ConceptAgent` as the smallest safe MVP slice

  **What to do**: Replace the current static Concept behavior with the new prompt pipeline + context + resilient client flow while preserving a non-empty offline response. Use `src/agents/prompts/concept.md` as the instruction source, build a Concept-specific scaffold, and record both user and assistant turns through the shared context lifecycle. This task establishes the first production-like LLM path.
  **Must NOT do**: Do not widen MVP by migrating additional agents inside this task, do not require a project to exist before `@concept` works, and do not bypass the shared prompt/context runtime with per-agent shortcuts.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: first end-to-end agent migration and MVP proof point
  - Skills: `[]` — no special skill required
  - Omitted: `['writing']` — this is runtime integration, not prose authoring

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 8,9,10 | Blocked By: 6

  **References**:
  - Pattern: `src/agents/concept.ts` — current static behavior to replace
  - Pattern: `src/agents/prompts/concept.md` — richest existing prompt asset and the MVP prompt source
  - Pattern: `src/agents/director.ts` — current `@concept` routing surface
  - API/Type: shared core from Tasks 2-6

  **Acceptance Criteria**:
  - [ ] `@concept` returns LLM-generated content when Anthropic is available.
  - [ ] `@concept` returns a non-empty static fallback when Anthropic is unavailable or runtime fallback resolves to offline.
  - [ ] Concept-specific tests cover full, reduced, and offline execution modes.

  **QA Scenarios**:
  ```
  Scenario: Concept agent uses shared LLM runtime successfully
    Tool: Bash
    Steps: run `npx vitest run src/agents/**/*.test.ts -t "concept llm flow"`
    Expected: tests confirm scaffold creation, prompt loading, context consumption, and non-empty generated response handling
    Evidence: .sisyphus/evidence/task-7-concept-flow.txt

  Scenario: Concept agent degrades to safe static fallback
    Tool: Bash
    Steps: run `ANTHROPIC_API_KEY='' npx vitest run src/agents/**/*.test.ts -t "concept offline fallback"`
    Expected: Concept returns a non-empty static response without throwing when no provider is available
    Evidence: .sisyphus/evidence/task-7-concept-offline.txt
  ```

  **Commit**: YES | Message: `feat(concept): migrate concept agent to llm runtime` | Files: `src/agents/concept.ts`, Concept tests, any scaffold helpers

- [ ] 8. Roll out planning agents: `world-builder.ts`, `character.ts`, `plot.ts`

  **What to do**: Migrate the three planning-phase agents as a batch, reusing the same runtime contracts and prompt pipeline proven by Concept. Each agent gets its own scaffold and uses the same category params/fallback traversal pattern; no special orchestration or cross-agent chaining is added. Maintain static fallback responses for each agent and keep project-null handling safe.
  **Must NOT do**: Do not add bootstrap chain execution, do not introduce new persisted canon files, and do not refactor Director routing beyond what is required for direct delegation.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: agent-specific scaffold tuning plus repeated migration pattern
  - Skills: `[]` — reuse the same implementation pattern established in Task 7
  - Omitted: `['oracle']` — architecture has already been decided

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 10 | Blocked By: 7

  **References**:
  - Pattern: `src/agents/world-builder.ts`, `src/agents/character.ts`, `src/agents/plot.ts` — current static stubs to convert
  - Pattern: `src/agents/prompts/world-builder.md`, `src/agents/prompts/character.md`, `src/agents/prompts/plot.md`
  - Pattern: `src/agents/concept.ts` after Task 7 — migration template to follow

  **Acceptance Criteria**:
  - [ ] All three planning agents call the shared LLM runtime and preserve direct routing behavior.
  - [ ] Each agent has a tested static fallback when the runtime returns offline.
  - [ ] Typecheck/build/test remain green after the batch migration.

  **QA Scenarios**:
  ```
  Scenario: Planning agents share the established migration pattern
    Tool: Bash
    Steps: run `npx vitest run src/agents/**/*.test.ts -t "planning agents"`
    Expected: World Builder, Character, and Plot each load their prompt asset, build a scaffold, and return non-empty responses through the shared runtime
    Evidence: .sisyphus/evidence/task-8-planning-agents.txt

  Scenario: Planning agents degrade safely without provider availability
    Tool: Bash
    Steps: run `ANTHROPIC_API_KEY='' npx vitest run src/agents/**/*.test.ts -t "planning offline fallback"`
    Expected: all three planning agents return static fallback content without throwing
    Evidence: .sisyphus/evidence/task-8-planning-offline.txt
  ```

  **Commit**: YES | Message: `feat(planning): migrate world character and plot agents` | Files: `src/agents/world-builder.ts`, `src/agents/character.ts`, `src/agents/plot.ts`, related tests

- [ ] 9. Roll out drafting/review agents: `scene.ts`, `dialogue.ts`, `critic.ts`, `editor.ts`

  **What to do**: Migrate the remaining drafting and review agents after the planning agents are stable. `scene.ts` and `dialogue.ts` should use drafting params, `critic.ts` should use critique params, and `editor.ts` should use editing params. Preserve each file’s current fallback posture and avoid introducing chain orchestration; Director continues single-agent delegation.
  **Must NOT do**: Do not add `scenePolish` chain execution, do not force Critic or Editor to mutate canon state, and do not broaden runtime behavior beyond the shared client/context/prompt pipeline.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: repeated agent migration with drafting/review-specific scaffold tuning
  - Skills: `[]` — pattern already proven by Tasks 7-8
  - Omitted: `['frontend-ui-ux']` — no UI involved

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 10 | Blocked By: 7

  **References**:
  - Pattern: `src/agents/scene.ts`, `src/agents/dialogue.ts`, `src/agents/critic.ts`, `src/agents/editor.ts`
  - Pattern: `src/agents/prompts/scene.md`, `src/agents/prompts/dialogue.md`, `src/agents/prompts/critic.md`, `src/agents/prompts/editor.md`
  - Pattern: category/fallback split from Task 2 and prompt pipeline from Task 3

  **Acceptance Criteria**:
  - [ ] Scene and Dialogue use drafting params; Critic uses critique params; Editor uses editing params.
  - [ ] All four agents preserve direct invocation behavior and return non-empty static fallbacks offline.
  - [ ] Build/typecheck/tests remain green after the final agent migration batch.

  **QA Scenarios**:
  ```
  Scenario: Drafting and review agents respect category parameters
    Tool: Bash
    Steps: run `npx vitest run src/agents/**/*.test.ts -t "drafting review agents"`
    Expected: tests prove each migrated agent resolves the correct category params while still using fallback candidates from the shared runtime
    Evidence: .sisyphus/evidence/task-9-drafting-review.txt

  Scenario: Scene agent remains safe with incomplete context
    Tool: Bash
    Steps: run `npx vitest run src/agents/**/*.test.ts -t "scene missing canon"`
    Expected: Scene returns a safe non-error response even when canon fields are null/empty
    Evidence: .sisyphus/evidence/task-9-scene-missing-context.txt
  ```

  **Commit**: YES | Message: `feat(agents): migrate drafting and review agents` | Files: `src/agents/scene.ts`, `src/agents/dialogue.ts`, `src/agents/critic.ts`, `src/agents/editor.ts`, related tests

- [ ] 10. Stabilize the integrated runtime and prepare release readiness

  **What to do**: Perform the final repo-side stabilization pass: ensure scripts are coherent, `.env.example` is accurate, prompt asset copying is part of the expected build path, obsolete contradictions in code comments are removed, and the release surface is documented around MVP constraints. Add or update smoke tests for Director basics, no-key degradation, prompt asset loading after build, and cross-project context isolation.
  **Must NOT do**: Do not add new features, do not expand to multi-provider support, and do not sneak in Director chain orchestration or persistent narrative memory.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: final integration hardening across multiple modules
  - Skills: `[]` — standard stabilization work
  - Omitted: `['git-master']` — commit mechanics are handled outside the planning task

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: F1,F2,F3,F4 | Blocked By: 8,9

  **References**:
  - Pattern: `package.json` — final script surface
  - Pattern: `.gitignore` — env hygiene already in place
  - Pattern: `README.md` and `docs/LLM_INTEGRATION_PLAN_FINAL.md` — user-facing expectation sources to keep aligned at MVP level

  **Acceptance Criteria**:
  - [ ] `npm run typecheck`, `npm run build`, and `npm test` all exit 0 on the final integrated branch.
  - [ ] `.env.example` documents the Anthropic-first MVP clearly.
  - [ ] Smoke tests cover prompt asset loading, offline fallback, Director regression, and project isolation.

  **QA Scenarios**:
  ```
  Scenario: Final integrated branch passes all repo checks
    Tool: Bash
    Steps: run `npm run typecheck && npm run build && npm test`
    Expected: all commands exit 0 and no migrated agent breaks the plugin build
    Evidence: .sisyphus/evidence/task-10-final-checks.txt

  Scenario: Director basics still work after all migrations
    Tool: Bash
    Steps: run `npx vitest run src/agents/**/*.test.ts -t "director regression"`
    Expected: tests confirm greetings/status/direct specialist routing still return non-empty responses and do not require LLM success to stay safe
    Evidence: .sisyphus/evidence/task-10-director-regression.txt
  ```

  **Commit**: YES | Message: `chore(runtime): stabilize llm rollout and release surface` | Files: scripts/docs/test updates, any small runtime fixes required to satisfy final checks

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after Task 1-2: `test(llm): add harness and shared runtime contracts`
- Commit after Task 3-5: `feat(llm): add prompt pipeline context manager and fallback runtime`
- Commit after Task 6-7: `feat(concept): wire plugin context and concept llm flow`
- Commit after Task 8-10: `feat(agents): roll out remaining novelist llm integrations`

## Success Criteria
- The implementation ships a Concept-first MVP without regressing current Director basics.
- Prompt assets load successfully in both source-tree development and built output validation.
- The runtime degrades safely when Anthropic is unavailable or a primary candidate fails.
- The remaining agent migrations reuse the same shared core rather than reimplementing LLM logic per file.
