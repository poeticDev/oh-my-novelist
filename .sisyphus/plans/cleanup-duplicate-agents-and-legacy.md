# Cleanup Duplicate Agents and Low-Risk Legacy Surfaces

## TL;DR
> **Summary**: Remove the duplicate OpenCode system-agent layer and low-risk legacy surfaces that are not part of the active TypeScript plugin runtime, while preserving the runtime keep-set and updating only the docs/tests directly coupled to the removals.
> **Deliverables**:
> - Remove `.opencode/` duplicate agent/config surface
> - Remove dead `src/commands/*` and stub tool surfaces
> - Remove `skills/novel-writing/` legacy skill surface
> - Clean low-risk misleading/superseded docs tied to removed surfaces
> - Add/adjust targeted regression checks for the cleanup boundary
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → (2,3,4,5) → (6,7) → Final Verification

## Context
### Original Request
- Remove duplicate agent structures if not actually used.
- Include cleanup of other currently unused low-risk legacy code in the same plan.

### Interview Summary
- User confirmed the observed `Editor/system` sessions came from an OpenCode system-agent chat, not an isolated plugin-only surface.
- User chose **complete removal** for unused duplicate agent structures.
- User chose **low-risk only** for additional legacy cleanup.
- User chose **tests-after** as the verification style.

### Oracle Review (gaps addressed)
- Treat `.opencode/*` as a conflicting parallel implementation surface, not as part of the active plugin runtime.
- Remove deletion targets in isolated batches so any hidden dependency can be reverted without contaminating the keep-set.
- Keep `README.md` and `CONFIGURATION.md` in the cleanup scope because they are user-facing and test-coupled; do not silently let them drift.
- Always run post-batch `typecheck` and `build`, because Vitest alone may miss broken unused TypeScript sources.

### Metis Review (gaps addressed)
- Protect the runtime keep-set explicitly and treat everything else as candidate-only, not automatically removable.
- Keep doc cleanup constrained to files that either reference removed surfaces or materially contradict the current runtime architecture.
- Use baseline verification before the first deletion batch, then post-batch verification after every atomic cleanup task.
- Add search-based acceptance criteria proving removed surfaces are gone from retained code/docs/tests.
- If any supposedly low-risk surface reveals a hidden supported workflow dependency during execution, stop cleanup for that item and move it to a follow-up plan rather than expanding scope.

## Work Objectives
### Core Objective
Eliminate duplicate and misleading non-runtime surfaces so the repository has one authoritative agent/runtime architecture: the TypeScript plugin under `src/` plus policy config via `oh-my-novelist.jsonc`.

### Deliverables
- `.opencode/` tree removed in full.
- `src/commands/*` removed in full.
- `src/tools/obsidian-vault.ts` and `src/tools/template-generator.ts` removed.
- `skills/novel-writing/` removed in full.
- User-facing docs (`README.md`, `CONFIGURATION.md`) updated to reflect the actual runtime surface.
- Superseded/misleading low-risk docs removed.
- Targeted regression coverage added for policy loading and cleanup boundaries.

### Definition of Done (verifiable conditions with commands)
- `npm test`
- `npm run typecheck`
- `npm run build`
- `git grep -nE '\.opencode|src/commands/|obsidian-vault|template-generator|skills/novel-writing' -- src tests docs README.md CONFIGURATION.md package.json oh-my-novelist.jsonc` returns no matches, except explicitly preserved historical docs if the plan says to retain them.
- `git grep -nE '@novel-new|@novel-continue|@novel-config|/novel-new|/novel-todo' -- README.md CONFIGURATION.md docs` returns no matches in retained docs.

### Must Have
- Preserve the active runtime keep-set:
  - `src/index.ts`
  - `src/agents/*.ts`
  - `src/agents/prompts/*.md`
  - `src/prompts/*`
  - `src/context/*`
  - `src/config/policy.ts`
  - `src/llm/*`
  - `src/tools/todo-manager.ts`
  - `package.json`
  - `oh-my-novelist.jsonc`
- Keep cleanup behavior-preserving for the active runtime.
- Update tests/docs in the same workstream as the deletions they depend on.
- Capture evidence for every cleanup batch under `.sisyphus/evidence/`.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No prompt-path moves or prompt-family behavior changes.
- No refactor of `src/index.ts`, `src/agents/*`, `src/prompts/*`, `src/config/policy.ts`, or `src/llm/*` beyond minimal reference cleanup explicitly required by deletions.
- No dependency modernization, package-manager changes, or unrelated script churn.
- No broad documentation rewrite outside files tied to removed surfaces.
- No compatibility shim for `.opencode/*`; this plan is full removal, not deprecation.
- No cleanup of medium-risk or ambiguous surfaces discovered during execution; such items must be deferred.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: **tests-after** using existing Vitest + TypeScript + build scripts
- QA policy: Every task includes agent-executed command/search scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: baseline and guardrails
- Task 1: Baseline verification + keep-set/deletion-set freeze

Wave 2: independent low-risk removal batches
- Task 2: Remove stub internal tools
- Task 3: Remove dead command surface
- Task 4: Remove legacy skill surface
- Task 5: Remove duplicate `.opencode/` system-agent/config surface

Wave 3: convergence and regression hardening
- Task 6: Clean low-risk docs/config references for removed surfaces
- Task 7: Update/add targeted regression tests for cleanup semantics

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 | None | 2, 3, 4, 5, 6, 7 |
| 2 | 1 | 6, 7 |
| 3 | 1 | 6, 7 |
| 4 | 1 | 6, 7 |
| 5 | 1 | 6, 7 |
| 6 | 2, 3, 4, 5 | Final Verification |
| 7 | 2, 3, 4, 5 | Final Verification |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → `unspecified-high`
- Wave 2 → 4 tasks → `quick`, `unspecified-high`, `writing`
- Wave 3 → 2 tasks → `writing`, `unspecified-high`
- Final Verification → 4 review tasks → `oracle`, `unspecified-high`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Establish cleanup baseline and freeze the protected keep-set

  **What to do**:
  - Run baseline verification on the current repository state: `npm test`, `npm run typecheck`, `npm run build`.
  - Capture the protected keep-set in executor notes and do not edit those files except for direct reference cleanup required by deleted surfaces.
  - Run repository searches to confirm the planned removal set and to detect any hidden supported workflows still referencing `.opencode/*`, `src/commands/*`, `skills/novel-writing/*`, `obsidian-vault`, or `template-generator`.
  - If a hidden supported workflow is found outside the planned cleanup files, stop that specific item and defer it rather than broadening scope.

  **Must NOT do**:
  - Do not delete anything in this task.
  - Do not modify runtime keep-set files.
  - Do not decide ad hoc to expand cleanup into `src/llm/*`, `src/config/policy.ts`, or prompt files.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: repository-wide risk framing and baseline capture
  - Skills: `[]` — no special skill needed
  - Omitted: `update-omo-models` — unrelated to cleanup scope

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5, 6, 7 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Runtime wiring: `src/index.ts:39-71` — plugin entrypoint, agent instantiation, policy loading
  - Prompt source path: `src/prompts/loader.ts:9-19` and `src/prompts/loader.ts:47-53` — prompt loader reads `src/agents/prompts` or `dist/agents/prompts`, never `.opencode/agents`
  - Policy path: `src/config/policy.ts:6` and `src/config/policy.ts:249-258` — official policy file is `oh-my-novelist.jsonc`
  - Scripts: `package.json:7-12` — baseline verification commands
  - User-facing architecture doc: `AGENTS.md` — keep as conceptual architecture reference unless directly contradicted by runtime docs

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm test` exits 0 and evidence is saved
  - [ ] `npm run typecheck` exits 0 and evidence is saved
  - [ ] `npm run build` exits 0 and evidence is saved
  - [ ] Search results for the removal set are captured and reviewed before any deletion
  - [ ] No hidden supported workflow dependency is discovered in retained runtime surfaces; if found, that item is explicitly deferred

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Baseline repository health
    Tool: Bash
    Steps: Run `npm test`; run `npm run typecheck`; run `npm run build`; save outputs separately
    Expected: All three commands exit 0
    Evidence: .sisyphus/evidence/task-1-baseline.txt

  Scenario: Hidden dependency sweep
    Tool: Bash
    Steps: Run `git grep -nE '\.opencode|src/commands/|obsidian-vault|template-generator|skills/novel-writing' -- .`
    Expected: Matches are limited to the planned cleanup set, historical docs explicitly preserved, or known tests/docs to update later
    Evidence: .sisyphus/evidence/task-1-hidden-deps.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: none

- [x] 2. Remove dead internal tool stubs and associated retained references

  **What to do**:
  - Delete `src/tools/obsidian-vault.ts`.
  - Delete `src/tools/template-generator.ts`.
  - Remove any retained import/export references to those modules inside `src/tools/` or other kept files.
  - Do not touch `src/tools/todo-manager.ts`.

  **Must NOT do**:
  - Do not alter todo-manager behavior.
  - Do not replace the deleted tools with new stubs or compatibility wrappers.
  - Do not add new tool functionality.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: small deletion-focused cleanup in a narrow file set
  - Skills: `[]` — no special skill needed
  - Omitted: `update-omo-models` — unrelated to cleanup scope

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6, 7 | Blocked By: 1

  **References** (executor has NO interview context — be exhaustive):
  - Keep-set tool to preserve: `src/tools/todo-manager.ts`
  - Legacy candidates identified by audit: `src/tools/obsidian-vault.ts`, `src/tools/template-generator.ts`
  - Runtime entrypoint: `src/index.ts:73-190` — only registered tools are `novelist_init_project` and `novelist_todo`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Deleted tool files no longer exist
  - [ ] `git grep -nE 'obsidian-vault|template-generator' -- src tests docs README.md CONFIGURATION.md package.json` returns no retained-code references, except intentional doc cleanup targets not yet updated in Task 6
  - [ ] `npm run typecheck` exits 0 after deletions

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Dead tool removal leaves no code references
    Tool: Bash
    Steps: Delete the two tool files; run `git grep -nE 'obsidian-vault|template-generator' -- src tests`
    Expected: No matches remain in retained code/tests
    Evidence: .sisyphus/evidence/task-2-tool-search.txt

  Scenario: Runtime keep-set still compiles
    Tool: Bash
    Steps: Run `npm run typecheck`
    Expected: Command exits 0 with no missing import/export errors
    Evidence: .sisyphus/evidence/task-2-typecheck.txt
  ```

  **Commit**: YES | Message: `refactor(cleanup): remove dead internal tool stubs` | Files: `src/tools/obsidian-vault.ts`, `src/tools/template-generator.ts`, any retained references under `src/tools/`

- [x] 3. Remove dead command surface under `src/commands/`

  **What to do**:
  - Delete the entire `src/commands/` directory.
  - Remove any retained references to those command modules from code/docs/tests if present.
  - Treat the directory as dead because plugin runtime registration happens in `src/index.ts`, not in `src/commands/*`.

  **Must NOT do**:
  - Do not convert these commands into active runtime tools.
  - Do not introduce slash-command support as part of cleanup.
  - Do not modify `src/index.ts` runtime behavior except minimal reference cleanup if a dead import exists.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: isolated dead-surface deletion
  - Skills: `[]` — no special skill needed
  - Omitted: `update-omo-models` — unrelated to cleanup scope

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6, 7 | Blocked By: 1

  **References** (executor has NO interview context — be exhaustive):
  - Runtime registration surface: `src/index.ts:73-190` — no `src/commands/*` registration exists there
  - Legacy candidates: `src/commands/novel-new.ts`, `src/commands/novel-continue.ts`, `src/commands/novel-todo.ts`, `src/commands/novel-export.ts`, `src/commands/novel-stats.ts`
  - Misleading docs to reconcile later: `CONFIGURATION.md`, `README.md`, and low-risk docs mentioning `/novel-*` or `@novel-*`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/commands/` no longer exists
  - [ ] `git grep -nE 'src/commands/|/novel-new|/novel-todo|@novel-new|@novel-continue|@novel-config' -- src tests docs README.md CONFIGURATION.md` returns only planned doc-cleanup matches before Task 6, then zero after Task 6
  - [ ] `npm run typecheck` exits 0 after command-surface deletion

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Dead command modules are gone
    Tool: Bash
    Steps: Delete `src/commands/`; run `git grep -nE 'src/commands/|novel-new|novel-continue|novel-export|novel-stats|novel-todo' -- src tests`
    Expected: No retained code/test references remain
    Evidence: .sisyphus/evidence/task-3-command-search.txt

  Scenario: Plugin runtime still typechecks without command modules
    Tool: Bash
    Steps: Run `npm run typecheck`
    Expected: Command exits 0
    Evidence: .sisyphus/evidence/task-3-typecheck.txt
  ```

  **Commit**: YES | Message: `refactor(cleanup): remove dead command stubs` | Files: `src/commands/**`, any direct references in retained code

- [x] 4. Remove legacy skill surface under `skills/novel-writing/`

  **What to do**:
  - Delete the entire `skills/novel-writing/` directory.
  - Remove retained references to this skill surface from docs/tests if present.
  - Keep only the active OpenCode plugin architecture; do not preserve the older skill-based implementation path.

  **Must NOT do**:
  - Do not migrate these files elsewhere.
  - Do not replace them with archived copies.
  - Do not add MCP/skill integration work in this cleanup plan.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: isolated directory removal with limited coupling
  - Skills: `[]` — no special skill needed
  - Omitted: `update-omo-models` — unrelated to cleanup scope

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6, 7 | Blocked By: 1

  **References** (executor has NO interview context — be exhaustive):
  - Legacy directory: `skills/novel-writing/README.md`, `skills/novel-writing/tools/*`, empty `skills/novel-writing/prompts/`
  - Keep-set runtime architecture: `src/index.ts`, `src/agents/*`, `src/prompts/*`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `skills/novel-writing/` no longer exists
  - [ ] `git grep -nE 'skills/novel-writing|vault_read|vault_write|template_generate' -- src tests docs README.md CONFIGURATION.md` returns only planned doc-cleanup matches before Task 6, then zero after Task 6
  - [ ] `npm run typecheck` exits 0 after removal

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Legacy skill surface removed cleanly
    Tool: Bash
    Steps: Delete `skills/novel-writing/`; run `git grep -nE 'skills/novel-writing|vault_read|vault_write|template_generate' -- src tests docs README.md CONFIGURATION.md`
    Expected: No retained code/test references remain; only preplanned doc cleanup targets may remain until Task 6
    Evidence: .sisyphus/evidence/task-4-skill-search.txt

  Scenario: Build still succeeds after removing skill surface
    Tool: Bash
    Steps: Run `npm run build`
    Expected: Command exits 0
    Evidence: .sisyphus/evidence/task-4-build.txt
  ```

  **Commit**: YES | Message: `refactor(cleanup): remove legacy skill surface` | Files: `skills/novel-writing/**`, any retained references

- [x] 5. Remove the duplicate `.opencode/` system-agent and YAML config surface

  **What to do**:
  - Delete the entire `.opencode/` tree, including:
    - `.opencode/agents/**`
    - `.opencode/commands/**`
    - `.opencode/config.yaml`
    - `.opencode/package.json`
    - `.opencode/bun.lock`
    - any nested dependency/cache content under `.opencode/`
  - Keep the TypeScript plugin runtime under `src/` as the only supported implementation surface.

  **Must NOT do**:
  - Do not recreate `.opencode/*` as compatibility shims.
  - Do not touch `src/agents/*` or `src/agents/prompts/*` in this task.
  - Do not change runtime policy behavior in `src/config/policy.ts`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: high-visibility architectural cleanup with misleading alternate execution surface
  - Skills: `[]` — no special skill needed
  - Omitted: `update-omo-models` — unrelated to cleanup scope

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6, 7 | Blocked By: 1

  **References** (executor has NO interview context — be exhaustive):
  - Duplicate system-agent surface: `.opencode/agents/**`, `.opencode/config.yaml`, `.opencode/commands/**`
  - Active runtime surface: `src/index.ts:39-71` — plugin entrypoint and active agent instantiation
  - Prompt loader source: `src/prompts/loader.ts:9-19` and `src/prompts/loader.ts:47-53` — active prompts come from `src/agents/prompts` or `dist/agents/prompts`
  - User-facing symptom: OpenCode `Editor/system` sessions reflected the `.opencode`/global system-agent layer rather than the plugin runtime

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.opencode/` no longer exists
  - [ ] `git grep -nE '\.opencode' -- src tests docs README.md CONFIGURATION.md package.json` returns only planned doc-cleanup matches before Task 6, then zero after Task 6
  - [ ] `npm run typecheck` exits 0 after removing `.opencode/`
  - [ ] `npm run build` exits 0 after removing `.opencode/`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Duplicate system-agent layer is fully removed
    Tool: Bash
    Steps: Delete `.opencode/`; run `git grep -nE '\.opencode' -- src tests docs README.md CONFIGURATION.md package.json`
    Expected: No retained code/test/config references remain; only planned doc cleanup targets may remain until Task 6
    Evidence: .sisyphus/evidence/task-5-opencode-search.txt

  Scenario: Active runtime surface still builds
    Tool: Bash
    Steps: Run `npm run typecheck`; run `npm run build`
    Expected: Both commands exit 0
    Evidence: .sisyphus/evidence/task-5-build-typecheck.txt
  ```

  **Commit**: YES | Message: `refactor(cleanup): remove duplicate opencode agent surface` | Files: `.opencode/**`

- [x] 6. Clean low-risk docs and config references tied to removed surfaces

  **What to do**:
  - Update `README.md` to remove claims, examples, or structure diagrams tied to removed `.opencode/*`, `src/commands/*`, skill surface, Obsidian/template stub tools, or unsupported slash-command flows.
  - Update `CONFIGURATION.md` to remove:
    - `.opencode/agents/` structure references
    - unsupported `@novel-*` / slash-command workflows
    - unsupported config paths that describe the removed alternate architecture
  - Delete these low-risk misleading/superseded docs:
    - `docs/ADOPTION_ANALYSIS.md`
    - `docs/TEST_SIMULATION.md`
    - `docs/LLM_INTEGRATION_PLAN.md`
    - `docs/LLM_INTEGRATION_PLAN2.md`
  - Preserve these as out of scope unless they directly block cleanup:
    - `AGENTS.md`
    - `COMMENT_REPLY.md`
    - `DESIGN.md`
    - `docs/LLM_INTEGRATION_PLAN_FINAL.md`

  **Must NOT do**:
  - Do not rewrite preserved historical docs.
  - Do not add new product surface claims.
  - Do not change user-facing setup guidance unrelated to removed surfaces.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: this is primarily documentation correction/removal
  - Skills: `[]` — no special skill needed
  - Omitted: `update-omo-models` — unrelated to cleanup scope

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification | Blocked By: 2, 3, 4, 5

  **References** (executor has NO interview context — be exhaustive):
  - User-facing docs to update: `README.md`, `CONFIGURATION.md`
  - Docs to delete: `docs/ADOPTION_ANALYSIS.md`, `docs/TEST_SIMULATION.md`, `docs/LLM_INTEGRATION_PLAN.md`, `docs/LLM_INTEGRATION_PLAN2.md`
  - Preserve as historical: `AGENTS.md`, `COMMENT_REPLY.md`, `DESIGN.md`, `docs/LLM_INTEGRATION_PLAN_FINAL.md`
  - Known stale structure section: `CONFIGURATION.md:335-349` — `.opencode/agents/` structure block
  - Keep current provider/policy guidance intact: `README.md:101-166`, `CONFIGURATION.md:32-84`

  **Acceptance Criteria** (agent-executable only):
  - [ ] The four low-risk obsolete docs are deleted
  - [ ] `README.md` and `CONFIGURATION.md` no longer mention removed surfaces or unsupported slash-command workflows
  - [ ] `git grep -nE '\.opencode|skills/novel-writing|obsidian-vault|template-generator|@novel-new|@novel-continue|@novel-config|/novel-new|/novel-todo' -- README.md CONFIGURATION.md docs` returns no matches in retained docs

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Retained docs no longer advertise removed surfaces
    Tool: Bash
    Steps: Update/delete the specified docs; run `git grep -nE '\.opencode|skills/novel-writing|obsidian-vault|template-generator|@novel-new|@novel-continue|@novel-config|/novel-new|/novel-todo' -- README.md CONFIGURATION.md docs`
    Expected: No matches remain in retained docs
    Evidence: .sisyphus/evidence/task-6-doc-grep.txt

  Scenario: User-facing model/policy guidance remains intact
    Tool: Bash
    Steps: Run `git grep -nE 'oh-my-novelist.jsonc|/connect|/models' -- README.md CONFIGURATION.md`
    Expected: Expected current guidance still exists in retained docs
    Evidence: .sisyphus/evidence/task-6-guidance-check.txt
  ```

  **Commit**: YES | Message: `docs(cleanup): remove obsolete surfaces from docs` | Files: `README.md`, `CONFIGURATION.md`, deleted docs under `docs/`

- [ ] 7. Update and add targeted regression tests for cleanup semantics

  **What to do**:
  - Update any existing tests that reference removed surfaces only if those tests are meant to continue covering the active runtime.
  - Add a focused regression test for `loadPluginPolicyConfig()` that locks the official policy file boundary to `oh-my-novelist.jsonc` and missing-file handling.
  - Remove tests whose sole purpose is validating deleted surfaces or deleted docs.
  - Do not broaden test scope beyond cleanup boundary verification.

  **Must NOT do**:
  - Do not redesign the test suite.
  - Do not add real-network or real-provider tests.
  - Do not remove tests that still cover the active runtime keep-set.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: needs judgment about keep-set coverage versus deleted-surface-only tests
  - Skills: `[]` — no special skill needed
  - Omitted: `update-omo-models` — unrelated to cleanup scope

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification | Blocked By: 2, 3, 4, 5

  **References** (executor has NO interview context — be exhaustive):
  - Existing docs-coupled test: `tests/agents/docs-migration.test.ts`
  - Existing policy boundary test: `tests/llm/policy-boundary.test.ts`
  - Existing prompt-family tests to preserve: `tests/prompts/model-family-routing.test.ts`
  - Existing runtime wiring tests to preserve unless directly broken: `tests/agents/director.smoke.test.ts`, `tests/context/manager.test.ts`, `tests/prompts/*.test.ts`, `tests/llm/*.test.ts`
  - Official policy boundary implementation: `src/config/policy.ts:6` and `src/config/policy.ts:249-258`

  **Acceptance Criteria** (agent-executable only):
  - [ ] A focused test exists for `loadPluginPolicyConfig()` with success, missing-file, and invalid-schema cases
  - [ ] Any removed/updated tests are limited to deleted-surface-only coverage or doc assertions invalidated by this cleanup
  - [ ] `npm test` exits 0 after test updates

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Cleanup regression coverage passes
    Tool: Bash
    Steps: Run `npm test`
    Expected: Command exits 0
    Evidence: .sisyphus/evidence/task-7-npm-test.txt

  Scenario: Policy boundary is locked to jsonc path
    Tool: Bash
    Steps: Run targeted tests for the new/updated policy-loading spec and `tests/llm/policy-boundary.test.ts`
    Expected: The targeted suite passes and proves the official config boundary is `oh-my-novelist.jsonc`
    Evidence: .sisyphus/evidence/task-7-policy-tests.txt
  ```

  **Commit**: YES | Message: `test(cleanup): lock policy boundary and remove stale assertions` | Files: updated/new tests under `tests/`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: baseline only — no commit, evidence capture only
- Commit 2: `refactor(cleanup): remove dead internal tool stubs`
- Commit 3: `refactor(cleanup): remove dead command stubs`
- Commit 4: `refactor(cleanup): remove legacy skill surface`
- Commit 5: `refactor(cleanup): remove duplicate opencode agent surface`
- Commit 6: `docs(cleanup): remove obsolete surfaces from docs`
- Commit 7: `test(cleanup): lock policy boundary and remove stale assertions`
- Rule: one cleanup surface per commit; if a task reveals a hidden supported dependency, stop and split follow-up rather than broadening the commit.

## Success Criteria
- Only one authoritative agent/runtime architecture remains in the repo: the TypeScript plugin under `src/`.
- `.opencode/`, `src/commands/`, `skills/novel-writing/`, and the two stub tools are gone.
- Retained docs no longer advertise removed or unsupported surfaces.
- The official policy boundary is enforced and regression-tested around `oh-my-novelist.jsonc`.
- `npm test`, `npm run typecheck`, and `npm run build` all pass after cleanup.
