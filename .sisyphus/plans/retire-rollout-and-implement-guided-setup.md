# Retire Superseded Rollout Plans and Implement Guided Setup

## TL;DR
> **Summary**: Retire stale LLM planning artifacts that no longer match the OpenCode-native architecture, then add a guided `novelist_setup` flow that authors and validates the canonical `oh-my-novelist.jsonc` policy file without taking ownership of provider/auth/runtime behavior.
> **Deliverables**:
> - Planning-artifact cleanup for superseded LLM rollout/setup assumptions
> - `novelist_setup` tool registered in the plugin runtime
> - Pure setup decision/preview/apply layer targeting `oh-my-novelist.jsonc`
> - Safe overwrite/backup behavior and deterministic validation/reporting
> - Regression coverage plus docs alignment in `README.md` and `CONFIGURATION.md`
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2 → (3, 4) → 5 → 6 → 7

## Context
### Original Request
- Retire the unnecessary pending plan(s) first.
- Then create a new execution plan for the remaining guided setup work.

### Interview Summary
- `guided-install-and-config.md` is still needed in substance, but it is stale because it targets `llm.config.json` while the implemented architecture uses `oh-my-novelist.jsonc`.
- `llm-integration-rollout.md` should not be re-executed; its implementation landed already and the current LLM contract is now governed by the completed OpenCode-native plan.
- The new work must stay inside the current ownership split: OpenCode owns providers/auth/runtime, while the plugin only authors novelist policy and surfaces setup guidance.

### Metis Review (gaps addressed)
- Freeze v1 scope to **config guidance only**; do not expand into project bootstrap or template generation.
- Treat stray `llm.config.json` as historical: warn if present, but do not read, write, or migrate it in v1.
- Make the public surface explicit: add `novelist_setup` tool and minimal discoverability updates in Director/help text.
- Model the setup flow as pure decision logic plus a thin tool wrapper so it is easy to test non-interactively.
- Add a docs/plan consistency task so stale filenames and old ownership assumptions are retired everywhere active.

## Work Objectives
### Core Objective
Replace stale LLM setup planning with a current, executable path: retire superseded plans, then implement a guided setup flow that safely creates and validates `oh-my-novelist.jsonc` while preserving the OpenCode-owned runtime boundary.

### Deliverables
- `.sisyphus/plans/llm-integration-rollout.md` marked as superseded historical context with a pointer to the canonical OpenCode-native plan
- `.sisyphus/plans/guided-install-and-config.md` marked as replaced/stale and redirected to this plan
- `src/tools/setup-manager.ts` (or equivalent pure setup module under `src/tools/`)
- `novelist_setup` tool registration in `src/index.ts`
- Guided setup behavior for `inspect`, `preview`, and `apply` actions
- Write-safe creation/update flow for `oh-my-novelist.jsonc` with backup-on-overwrite
- Validation/report output that checks schema + plugin-owned policy resolution only
- Tests under `tests/setup/` plus docs migration coverage
- Updated `README.md` and `CONFIGURATION.md`

### Definition of Done (verifiable conditions with commands)
- `rg -n "llm\.config\.json" README.md CONFIGURATION.md .sisyphus/plans` returns only historical/superseded references, not active implementation instructions
- `npm run typecheck` exits 0
- `npm run build` exits 0
- `npm test` exits 0
- `npx vitest run tests/setup/*.test.ts tests/agents/director.smoke.test.ts tests/agents/docs-migration.test.ts tests/llm/policy-boundary.test.ts` exits 0
- Running the guided setup tool in tests can preview and apply `oh-my-novelist.jsonc` without introducing provider credentials, base URLs, or runtime ownership logic

### Must Have
- Canonical config target is **only** `oh-my-novelist.jsonc`
- `novelist_setup` supports exactly three actions in v1: `inspect`, `preview`, `apply`
- `inspect` reports current config status and warns on stray historical `llm.config.json`
- `preview` returns the exact would-write config payload and overwrite/backup implications without writing
- `apply` writes `oh-my-novelist.jsonc`, blocks overwrite unless explicit confirmation is provided, and creates timestamped backup of the previous file before replacement
- Validation is limited to plugin-owned checks: schema validation and deterministic policy-resolution smoke checks using existing policy loader/resolver
- Minimal discoverability update so users can find `novelist_setup` through help/Director messaging

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No provider/auth/runtime setup logic in the plugin
- No writing of API keys, base URLs, custom provider endpoints, `/connect`, or `/models` state
- No `llm.config.json` creation, migration, or active support in v1
- No expansion into `novelist_init_project`, templates, or general onboarding workflow
- No chat-only wizard that requires manual freeform interaction to be testable
- No broad rewrite of unrelated docs; limit updates to setup/config path accuracy and discoverability

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after, with task-scoped regression additions and final full-suite verification
- QA policy: every implementation task includes exact file/command assertions and at least one failure-path scenario
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}` during execution; docs migration checks must be machine-verifiable

## Execution Strategy
### Parallel Execution Waves
Wave 1: retire stale planning assumptions and lock TDD contract
Wave 2: implement pure setup logic and runtime wiring in parallel
Wave 3: write/apply safety, docs alignment, and final integration verification

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 | None | 2, 3, 4, 5, 6, 7 |
| 2 | 1 | 3, 4, 5, 6, 7 |
| 3 | 2 | 5, 6, 7 |
| 4 | 2 | 5, 6, 7 |
| 5 | 3, 4 | 6, 7 |
| 6 | 5 | 7 |
| 7 | 5, 6 | F1-F4 |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → `writing`, `unspecified-high`
- Wave 2 → 2 tasks → `unspecified-high`, `quick`
- Wave 3 → 3 tasks → `unspecified-high`, `writing`, `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Retire stale LLM planning artifacts before new work starts

  **What to do**: Update `.sisyphus/plans/llm-integration-rollout.md` to mark it as superseded historical context and explicitly point to `.sisyphus/plans/multi-provider-model-config.md` as the canonical LLM architecture plan. Update `.sisyphus/plans/guided-install-and-config.md` to mark it stale/replaced and point to this new plan because its `llm.config.json` assumptions are obsolete.
  **Must NOT do**: Do not delete old plans. Do not rewrite their execution history. Do not reopen rollout implementation work.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: planning-artifact cleanup with precise historical notes
  - Skills: `[]` — no special skill needed
  - Omitted: `update-omo-models` — unrelated to setup/config scope

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5, 6, 7 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Superseding plan: `.sisyphus/plans/multi-provider-model-config.md:4-14` — marks the OpenCode-native architecture as the current source of truth
  - Closed fix plan: `.sisyphus/plans/fix-multi-provider-model-config-boundary-issues.md` — confirms boundary issues were resolved under the new architecture
  - Historical rollout: `.sisyphus/plans/llm-integration-rollout.md` — implementation already landed but should not be re-run
  - Stale guided setup plan: `.sisyphus/plans/guided-install-and-config.md` — still references `llm.config.json`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `llm-integration-rollout.md` contains a clear superseded note pointing to `multi-provider-model-config.md`
  - [ ] `guided-install-and-config.md` contains a clear replaced/stale note pointing to this plan
  - [ ] `rg -n "Status|SUPERSEDED|REPLACED" .sisyphus/plans/llm-integration-rollout.md .sisyphus/plans/guided-install-and-config.md` shows the new notes

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Historical plans are retired without deletion
    Tool: Bash
    Steps: Read both plan files; verify they contain superseded/replaced notes and retained historical content
    Expected: Both plans remain present, with explicit redirection to the canonical current plan path(s)
    Evidence: .sisyphus/evidence/task-1-retire-stale-plans.txt

  Scenario: No active setup instructions still point to llm.config.json in current planning surface
    Tool: Bash
    Steps: Run `rg -n "llm\.config\.json" .sisyphus/plans`
    Expected: Matches in active plan files are limited to historical/stale context, not current execution instructions
    Evidence: .sisyphus/evidence/task-1-retire-stale-plans-rg.txt
  ```

  **Commit**: YES | Message: `chore(plans): retire stale rollout and setup assumptions` | Files: `.sisyphus/plans/llm-integration-rollout.md`, `.sisyphus/plans/guided-install-and-config.md`, `.sisyphus/plans/retire-rollout-and-implement-guided-setup.md`

- [ ] 2. Lock the guided-setup contract with failing tests against the live config boundary

  **What to do**: Add tests that define the v1 behavior before implementation. Freeze the public contract: `novelist_setup` supports `inspect`, `preview`, `apply`; the only writable target is `oh-my-novelist.jsonc`; `llm.config.json` is warning-only historical context; the tool never accepts or emits provider credentials. Create the new `tests/setup/` directory and add test files for contract, tool behavior, write safety, and docs migration expectations.
  **Must NOT do**: Do not implement the runtime logic in this task. Do not add any provider/auth fields to test fixtures.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: contract-first test design across new and existing test surfaces
  - Skills: `[]`
  - Omitted: `update-omo-models`

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3, 4, 5, 6, 7 | Blocked By: 1

  **References**:
  - Canonical config contract: `src/config/policy.ts` — `oh-my-novelist.jsonc` loader/schema boundary
  - Tool registration pattern: `src/index.ts:75-189` — existing `novelist_init_project` and `novelist_todo`
  - Smoke test pattern: `tests/agents/director.smoke.test.ts`
  - Docs migration coverage: `tests/agents/docs-migration.test.ts`
  - Existing policy boundary tests: `tests/llm/policy-boundary.test.ts`

  **Acceptance Criteria**:
  - [ ] `tests/setup/` exists with at least: `setup-contract.test.ts`, `setup-tool.test.ts`, `setup-write-safety.test.ts`, `setup-validation-report.test.ts`
  - [ ] Tests assert the canonical write target is `oh-my-novelist.jsonc`
  - [ ] Tests assert `llm.config.json` is warning-only and never the write target
  - [ ] Tests assert preview/apply outputs never include provider credentials or base URLs

  **QA Scenarios**:
  ```
  Scenario: New setup contract tests fail before implementation and describe the desired behavior
    Tool: Bash
    Steps: Run `npx vitest run tests/setup/*.test.ts`
    Expected: The suite executes and initially fails only for not-yet-implemented guided setup behavior, not for syntax or import errors
    Evidence: .sisyphus/evidence/task-2-setup-contract-tests.txt

  Scenario: Docs migration assertions ban active llm.config.json guidance
    Tool: Bash
    Steps: Run `npx vitest run tests/agents/docs-migration.test.ts`
    Expected: The test expectations explicitly cover canonical config-path language for setup docs
    Evidence: .sisyphus/evidence/task-2-docs-migration-tests.txt
  ```

  **Commit**: YES | Message: `test(setup): define guided setup contract for canonical config` | Files: `tests/setup/*`, `tests/agents/docs-migration.test.ts`

- [ ] 3. Implement the pure setup decision layer under existing module boundaries

  **What to do**: Add a pure setup module under `src/tools/` (preferred: `src/tools/setup-manager.ts`) plus any small helper under `src/config/` or `src/utils/` only if strictly needed. The pure layer must: inspect current config presence, detect malformed config through the existing loader/schema, detect historical `llm.config.json`, generate a preview object/text for `oh-my-novelist.jsonc`, and decide whether overwrite/backup is required. Keep it framework-free and independently testable.
  **Must NOT do**: Do not register the tool in `src/index.ts` yet. Do not write files in this task. Do not create a new provider/runtime abstraction.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: core application logic with high correctness requirements
  - Skills: `[]`
  - Omitted: `update-omo-models`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5, 6, 7 | Blocked By: 2

  **References**:
  - File-writing precedent to improve upon: `src/utils/state.ts`, `src/tools/todo-manager.ts`
  - Canonical config schema/loader: `src/config/policy.ts`
  - LLM boundary contract: `.sisyphus/plans/multi-provider-model-config.md:72-89`

  **Acceptance Criteria**:
  - [ ] Pure setup logic can compute `inspect`, `preview`, and apply-preconditions without requiring OpenCode runtime calls
  - [ ] `inspect` reports one of: missing config, valid config present, malformed config present, historical `llm.config.json` present
  - [ ] `preview` produces deterministic `oh-my-novelist.jsonc` content from setup inputs and excludes credentials/base URLs
  - [ ] Unit tests for the pure layer pass

  **QA Scenarios**:
  ```
  Scenario: Inspect reports current repo-state conditions correctly
    Tool: Bash
    Steps: Run `npx vitest run tests/setup/setup-contract.test.ts tests/setup/setup-tool.test.ts`
    Expected: Cases for missing, malformed, existing, and legacy historical-file presence all pass
    Evidence: .sisyphus/evidence/task-3-setup-inspect-tests.txt

  Scenario: Preview never emits runtime-owned fields
    Tool: Bash
    Steps: Run the setup preview-focused tests and grep snapshots/returned content for `apiKey|baseURL|endpoint|provider`
    Expected: No runtime-owned field is emitted except model/family policy identifiers explicitly allowed by schema
    Evidence: .sisyphus/evidence/task-3-preview-safety.txt
  ```

  **Commit**: YES | Message: `feat(setup): add pure guided setup decision layer` | Files: `src/tools/setup-manager.ts`, small helpers only if required, `tests/setup/*`

- [ ] 4. Register `novelist_setup` and add minimal discoverability wiring

  **What to do**: Register a new `novelist_setup` tool in `src/index.ts` following the existing tool shape. Expose exactly three actions: `inspect`, `preview`, `apply`. Wire it to the pure setup module created in Task 3. Add minimal Director/help discoverability so users asking for setup/config are told to use `novelist_setup`; keep this lightweight and non-conversational.
  **Must NOT do**: Do not add slash commands, persistent multi-turn wizard state, or project-init side effects.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: focused registration/wiring work on established patterns
  - Skills: `[]`
  - Omitted: `update-omo-models`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5, 6, 7 | Blocked By: 2

  **References**:
  - Tool wiring pattern: `src/index.ts:75-189`
  - Director discoverability surface: `src/agents/director.ts`
  - Tool result shape precedent: `src/tools/todo-manager.ts`

  **Acceptance Criteria**:
  - [ ] `src/index.ts` registers `novelist_setup` with parameters for `inspect|preview|apply`
  - [ ] Tool responses use structured success/error payloads matching existing tool style
  - [ ] Director/help discoverability includes setup/config hints without introducing a new agent
  - [ ] Smoke tests for tool registration/discoverability pass

  **QA Scenarios**:
  ```
  Scenario: Tool is registered and callable through the runtime entry point
    Tool: Bash
    Steps: Run `npx vitest run tests/setup/setup-tool.test.ts tests/agents/director.smoke.test.ts`
    Expected: The setup tool is registered, returns structured results, and Director/help messaging points users to it
    Evidence: .sisyphus/evidence/task-4-setup-tool-registration.txt

  Scenario: Unsupported actions are rejected deterministically
    Tool: Bash
    Steps: Run the negative-path setup tool tests with an invalid action payload
    Expected: The tool returns `success: false` and a precise validation error
    Evidence: .sisyphus/evidence/task-4-setup-invalid-action.txt
  ```

  **Commit**: YES | Message: `feat(tooling): register novelist setup command` | Files: `src/index.ts`, `src/agents/director.ts`, `tests/setup/*`, `tests/agents/director.smoke.test.ts`

- [ ] 5. Implement write-safe apply behavior for `oh-my-novelist.jsonc`

  **What to do**: Add the file mutation path for `apply`. If `oh-my-novelist.jsonc` does not exist, write it directly. If it exists, require explicit overwrite confirmation and create a backup named `oh-my-novelist.jsonc.bak.YYYYMMDD-HHmmss` before replacement. Return the backup path in the tool result. Ensure malformed existing config is still backed up before overwrite. Handle permission-denied write failures with deterministic error messages.
  **Must NOT do**: Do not write `llm.config.json`. Do not silently overwrite existing config. Do not attempt to merge arbitrary old config structures.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: file safety semantics and failure-path correctness matter here
  - Skills: `[]`
  - Omitted: `update-omo-models`

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 6, 7 | Blocked By: 3, 4

  **References**:
  - Current simple write pattern to improve: `src/utils/state.ts`, `src/tools/todo-manager.ts`
  - Canonical file target: `src/config/policy.ts` loader expects repo-root `oh-my-novelist.jsonc`
  - Temp-dir lifecycle pattern: `tests/context/manager.test.ts`, `tests/prompts/loader.test.ts`

  **Acceptance Criteria**:
  - [ ] `apply` writes only `oh-my-novelist.jsonc`
  - [ ] Existing config requires explicit overwrite confirmation
  - [ ] Existing config overwrite creates timestamped backup and returns its path
  - [ ] Permission-denied and malformed-existing-config cases are covered by tests

  **QA Scenarios**:
  ```
  Scenario: Apply writes a new canonical config safely
    Tool: Bash
    Steps: Run `npx vitest run tests/setup/setup-write-safety.test.ts`
    Expected: New-file, overwrite-confirmed, and backup-created paths all pass against temp dirs
    Evidence: .sisyphus/evidence/task-5-setup-write-safety.txt

  Scenario: Apply refuses silent overwrite and surfaces write failures clearly
    Tool: Bash
    Steps: Run failure-path write-safety tests for missing confirmation and permission denial
    Expected: The tool returns deterministic errors and leaves the original file intact when overwrite is not confirmed
    Evidence: .sisyphus/evidence/task-5-setup-write-failures.txt
  ```

  **Commit**: YES | Message: `feat(setup): add safe config apply and backup flow` | Files: `src/tools/setup-manager.ts`, helper utilities if needed, `tests/setup/setup-write-safety.test.ts`

- [ ] 6. Add validation/report behavior that stays inside plugin-owned policy checks

  **What to do**: Implement the validation/report output returned by `inspect` and `apply`. Validation must use the canonical schema loader and deterministic policy-resolution smoke checks only — for example, loading the just-written file through `loadPluginPolicyConfig()` and verifying configured selections resolve with `resolvePluginPolicy()` for representative categories/agents. If no OpenCode provider is connected, report it as informational/non-blocking, not a plugin failure. If historical `llm.config.json` exists, report it as a warning only.
  **Must NOT do**: Do not perform live provider connectivity checks, `/connect`, `/models`, or credential verification.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: boundary-sensitive validation logic
  - Skills: `[]`
  - Omitted: `update-omo-models`

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 7 | Blocked By: 5

  **References**:
  - Loader/schema: `src/config/policy.ts`
  - Resolution smoke path: `src/llm/opencode-resolution.ts`, `src/llm/factory.ts`
  - Existing boundary tests: `tests/llm/policy-boundary.test.ts`, `tests/agents/opencode-integration.smoke.test.ts`

  **Acceptance Criteria**:
  - [ ] Validation output distinguishes errors vs warnings vs info
  - [ ] Schema-invalid config returns error status
  - [ ] Missing OpenCode provider/runtime is surfaced as informational guidance, not plugin-owned failure
  - [ ] Historical `llm.config.json` is surfaced as warning-only

  **QA Scenarios**:
  ```
  Scenario: Validation reports schema and policy-resolution status correctly
    Tool: Bash
    Steps: Run `npx vitest run tests/setup/setup-validation-report.test.ts tests/llm/policy-boundary.test.ts`
    Expected: Valid config passes, malformed config fails, and deterministic resolution smoke checks succeed
    Evidence: .sisyphus/evidence/task-6-setup-validation-report.txt

  Scenario: Runtime-owned concerns remain informational only
    Tool: Bash
    Steps: Run negative-path validation tests simulating no OpenCode provider/runtime availability
    Expected: The report contains an info/warning message directing users to OpenCode setup without turning it into a plugin validation error
    Evidence: .sisyphus/evidence/task-6-runtime-boundary-validation.txt
  ```

  **Commit**: YES | Message: `feat(setup): add policy-only validation and report output` | Files: `src/tools/setup-manager.ts`, `tests/setup/setup-validation-report.test.ts`, targeted boundary tests if updated

- [ ] 7. Update active docs to make guided setup the canonical onboarding path

  **What to do**: Update `README.md` and `CONFIGURATION.md` so the setup flow, config path, and boundary ownership are accurate. Add `novelist_setup` examples to quick start and configuration docs. Remove active instructions that imply `llm.config.json`, plugin-owned provider setup, or stale config directory diagrams. Keep `AGENTS.md` unchanged unless a direct setup mention is needed for discoverability consistency.
  **Must NOT do**: Do not rewrite unrelated product docs. Do not introduce promises unsupported by the implemented tool.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: precise docs migration with architecture-boundary accuracy
  - Skills: `[]`
  - Omitted: `update-omo-models`

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: F1-F4 | Blocked By: 5, 6

  **References**:
  - Current README quick-start and LLM sections: `README.md`
  - Current config guide with stale path language: `CONFIGURATION.md`
  - Canonical architecture source: `.sisyphus/plans/multi-provider-model-config.md:72-89`
  - Docs migration test surface: `tests/agents/docs-migration.test.ts`

  **Acceptance Criteria**:
  - [ ] `README.md` documents `novelist_setup` and `oh-my-novelist.jsonc`
  - [ ] `CONFIGURATION.md` no longer contains stale config-path or plugin-owned provider guidance
  - [ ] Docs tests enforce the canonical path and setup wording
  - [ ] `rg -n "llm\.config\.json|config\.yaml|provider registry|baseURL" README.md CONFIGURATION.md` returns no active guidance violations

  **QA Scenarios**:
  ```
  Scenario: Canonical setup docs are enforced by tests
    Tool: Bash
    Steps: Run `npx vitest run tests/agents/docs-migration.test.ts`
    Expected: Docs migration tests pass and assert the canonical setup/config language
    Evidence: .sisyphus/evidence/task-7-docs-migration.txt

  Scenario: No stale setup guidance remains in active docs
    Tool: Bash
    Steps: Run `rg -n "llm\.config\.json|config\.yaml|baseURL|/connect.*plugin" README.md CONFIGURATION.md`
    Expected: No active setup instructions violate the current architecture boundary
    Evidence: .sisyphus/evidence/task-7-docs-rg.txt
  ```

  **Commit**: YES | Message: `docs(setup): document canonical guided setup flow` | Files: `README.md`, `CONFIGURATION.md`, `tests/agents/docs-migration.test.ts`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: `chore(plans): retire stale rollout and setup assumptions`
- Commit 2: `test(setup): define guided setup contract for canonical config`
- Commit 3: `feat(setup): add pure guided setup decision layer`
- Commit 4: `feat(tooling): register novelist setup command`
- Commit 5: `feat(setup): add safe config apply and backup flow`
- Commit 6: `feat(setup): add policy-only validation and report output`
- Commit 7: `docs(setup): document canonical guided setup flow`

## Success Criteria
- Historical plans no longer appear actionable when they are not.
- `novelist_setup` becomes the canonical setup surface for plugin-owned policy configuration.
- The only written config target is `oh-my-novelist.jsonc`.
- Setup behavior is testable without manual interaction and does not cross into OpenCode-owned runtime/provider concerns.
- Active docs match the implemented architecture and setup flow.
