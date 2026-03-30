# Guided Install and Config for oh-my-novelist

## TL;DR
> **Summary**: Add a dedicated guided setup command that interviews the user, checks provider/model readiness, safely generates `llm.config.json`, runs doctor-style verification, and explains the resulting setup. This track is separate from, and depends on, the multi-provider runtime/config foundation.
> **Deliverables**:
> - Dedicated setup command
> - Guided interview/state machine
> - Safe preview/replace/backup flow for `llm.config.json`
> - Validation pipeline: schema + credentials + cheap smoke test
> - Doctor/report summary output
> - Automated tests and docs for setup flow
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: foundation contract -> setup flow model -> preview/write safety -> validation orchestration -> command wiring -> docs/verification

## Context
### Original Request
- oh-my-openagent provides AI-guided installation instructions.
- oh-my-openagent also checks model availability and generates config files.
- Consider adopting that pattern for this plugin.
- Decision made: split this into a separate track from the multi-provider runtime/config work.

### Interview Summary
- This track is separate from the multi-provider runtime/config plan.
- Guided setup should use a **dedicated setup command**.
- If `llm.config.json` already exists, default behavior is **preview + explicit replace confirmation**.
- Validation depth for v1 is **schema validation + credential checks + cheap smoke test**.
- v1 scope is limited to technical setup: guided interview, provider/model checks, config generation, doctor-style verification, and explanation of what was configured.
- Broader novelist project scaffolding is explicitly out of scope for this track.

### Metis Review (gaps addressed)
- This track must consume the future multi-provider foundation rather than reimplement provider registry/schema logic.
- The authoritative runtime integration point must be treated as `src/index.ts` unless proven otherwise.
- The setup flow must be modeled as a testable pure decision/state layer with thin command IO around it.
- Overwrite/backup/redaction behavior must be fully specified before implementation.
- Validation phases must be explicit: schema -> credential -> endpoint/model availability -> cheap smoke test.

## Work Objectives
### Core Objective
Provide an AI-executable onboarding/setup experience for LLM configuration in oh-my-novelist that can safely create or replace `llm.config.json`, verify it, and explain the outcome, without expanding into generic project scaffolding or provider-platform work.

### Deliverables
- Dedicated setup command and command contract
- Guided setup interview/state machine
- Config preview/replace/backup logic for `llm.config.json`
- Validation orchestration over the multi-provider foundation
- Doctor/report summary output
- Help/docs/troubleshooting for setup flow
- Automated tests for happy path, overwrite safety, redaction, and failure modes

### Definition of Done (verifiable conditions with commands)
- `npm run typecheck` exits 0.
- `npm run build` exits 0.
- `npm test` exits 0.
- `npx vitest run tests/setup/*.test.ts tests/config/*.test.ts tests/agents/*.test.ts` exits 0.
- A guided setup command can create a valid `llm.config.json` from interview answers using the multi-provider foundation contract.
- Existing `llm.config.json` is never overwritten without preview + explicit confirmation.
- Setup previews and doctor/report outputs redact secrets deterministically.
- Failed validation follows declared policy and never leaves ambiguous half-written config.

### Must Have
- Dedicated setup command named `novelist_setup`
- Guided interview for provider/model/config choices
- Repo-root `llm.config.json` preview and safe write path
- Backup behavior on overwrite path
- Validation phases: schema, credentials, cheap smoke test
- Doctor/report summary explaining what was configured, skipped, and why
- Secret redaction in previews/reports/logs
- Reuse of multi-provider foundation types/resolvers/adapters

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No broader novelist project scaffolding
- No generic provider marketplace/platform logic
- No YAML runtime loading
- No silent overwrite of existing config
- No storing secrets in docs/snapshots/previews by default
- No heavy command-framework rewrite based on passive `.opencode/commands/*.yaml`
- No dependency duplication of provider registry or runtime schema ownership
- No vague “wizard works” acceptance criteria

### Default Operational Policy
- Authoritative setup surface for v1: runtime-registered tool `novelist_setup` in `src/index.ts`
- Optional slash-command aliases are out of scope for v1
- Backup filename pattern on overwrite: `llm.config.json.bak.YYYYMMDD-HHmmss`
- Cheap smoke test policy: for every unique `providerAlias/modelId` candidate that will be written, run one minimal non-streaming validation request with `temperature=0`, `maxTokens=32`, timeout `10s`, and no retries; candidates that fail smoke test are excluded from the generated config preview with explicit warnings; if all candidates are excluded, setup aborts without writing

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after + Vitest
- QA policy: Every task has executable scenarios with concrete commands
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: dependency contract, setup flow model, overwrite/backup safety
Wave 2: validation orchestration, command wiring, doctor/reporting
Wave 3: docs/help, end-to-end setup regression, final hardening

### Dependency Matrix (full, all tasks)
- 1 blocks 2,3,4,5,6,7
- 2 blocks 4,5,6,7
- 3 blocks 5,6,7
- 4 blocks 5,6,7
- 5 blocks 6,7
- 6 blocks 7

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 -> 3 tasks -> unspecified-high, deep
- Wave 2 -> 2 tasks -> unspecified-high
- Wave 3 -> 2 tasks -> writing, unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Lock the dependency contract between guided setup and the multi-provider foundation

  **What to do**: Define the exact interfaces this track consumes from the separate multi-provider runtime/config foundation: config schema validator, provider/model availability checker, credential checker, smoke-test executor, and doctor/report inputs. Ensure setup does not re-own provider registry, schema, or fallback-resolution logic.
  **Must NOT do**: Do not duplicate `llm.config.json` schema ownership, do not invent a second provider registry, and do not let setup command embed provider-specific request logic.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: boundary-setting between two related architecture tracks
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5,6,7 | Blocked By: none

  **References**:
  - Pattern: `.sisyphus/plans/multi-provider-model-config.md` — owning plan for runtime foundation
  - Pattern: `src/index.ts` — authoritative runtime entrypoint today
  - Pattern: `src/llm/factory.ts`, `src/llm/chains.ts` — current runtime ownership boundary
  - Pattern: `.opencode/config.yaml` — passive config ideas only, not runtime source of truth

  **Acceptance Criteria**:
  - [ ] The plan defines which module owns schema, validation, and provider registry.
  - [ ] Setup track only consumes foundation interfaces and does not redefine them.
  - [ ] Runtime integration surface is fixed to the `novelist_setup` tool in `src/index.ts`.

  **QA Scenarios**:
  ```
  Scenario: Dependency contract fixtures compile against the foundation interface
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-foundation-contract.test.ts`
    Expected: tests pass and setup contract imports/uses shared foundation interfaces without local duplicates
    Evidence: .sisyphus/evidence/task-1-foundation-contract.txt

  Scenario: No duplicate provider/schema ownership is introduced
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-foundation-contract.test.ts -t "does not duplicate runtime schema ownership"`
    Expected: test passes and setup layer depends on shared schema/provider contracts only
    Evidence: .sisyphus/evidence/task-1-foundation-contract-error.txt
  ```

  **Commit**: YES | Message: `refactor(setup): define setup foundation contract` | Files: `src/setup/*`, shared interface touchpoints, `tests/setup/*`

- [ ] 2. Implement the guided interview/state machine as a pure setup flow model

  **What to do**: Create a pure domain/state layer for the guided setup command. It must capture required questions, branching by provider type, skip logic, cancel/back behavior, and final config assembly inputs. The state layer must be testable without command IO.
  **Must NOT do**: Do not tie the flow model directly to terminal/chat IO, do not ask creative workflow/project-setup questions in v1, and do not let setup proceed without explicit answers for required technical fields.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: state/flow design with branching and testability requirements
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4,5,6,7 | Blocked By: 1

  **References**:
  - Pattern: openagent-inspired flow: interview -> configure -> verify -> explain
  - Pattern: `src/agents/director.ts` — example conversational routing style, but not the execution anchor
  - Pattern: current runtime tools in `src/index.ts` — actual integration context

  **Acceptance Criteria**:
  - [ ] Required setup questions and branching are encoded as testable state transitions.
  - [ ] User abort/cancel and back-navigation behavior are explicitly modeled.
  - [ ] Config assembly inputs are produced without writing files.

  **QA Scenarios**:
  ```
  Scenario: Guided flow reaches a complete config candidate from valid answers
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-flow-state.test.ts -t "builds config candidate from complete interview answers"`
    Expected: test passes and final state contains a complete config candidate plus validation plan
    Evidence: .sisyphus/evidence/task-2-setup-flow.txt

  Scenario: Cancel or back path is deterministic
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-flow-state.test.ts -t "supports cancel and back without corrupting state"`
    Expected: test passes and flow exits or rewinds without partial writes or undefined states
    Evidence: .sisyphus/evidence/task-2-setup-flow-error.txt
  ```

  **Commit**: YES | Message: `feat(setup): add guided setup flow model` | Files: `src/setup/*`, `tests/setup/*`

- [ ] 3. Implement preview, confirmation, backup, and atomic write behavior for `llm.config.json`

  **What to do**: Build the config output layer that renders a redacted preview, detects existing `llm.config.json`, requires explicit replace confirmation, creates backups using the pattern `llm.config.json.bak.YYYYMMDD-HHmmss`, and performs atomic writes. Redaction rules must cover previews, doctor reports, logs, and snapshots.
  **Must NOT do**: Do not overwrite an existing config silently, do not write secrets to preview/report output, and do not leave half-written config files after failed writes.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: file safety, overwrite semantics, and redaction correctness
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5,6,7 | Blocked By: 1

  **References**:
  - Pattern: repo-root `llm.config.json` from the multi-provider plan
  - Pattern: `src/utils/state.ts`, `src/tools/todo-manager.ts` — existing JSON write/read conventions to study, not copy blindly
  - Pattern: `.env.example` — sensitive value handling baseline

  **Acceptance Criteria**:
  - [ ] Existing config always triggers preview + explicit replace confirmation before overwrite.
  - [ ] Backup is created only on the overwrite path and follows `llm.config.json.bak.YYYYMMDD-HHmmss` exactly.
  - [ ] Atomic write behavior prevents ambiguous partial config state.
  - [ ] Preview/report output redacts secrets deterministically.

  **QA Scenarios**:
  ```
  Scenario: Existing config requires preview and explicit confirmation before replace
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-write-safety.test.ts -t "requires preview and confirmation before overwriting llm config"`
    Expected: test passes and no overwrite occurs until confirmation is received
    Evidence: .sisyphus/evidence/task-3-write-safety.txt

  Scenario: Secret values are redacted in preview and report output
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-write-safety.test.ts -t "redacts secrets in preview and doctor output"`
    Expected: test passes and snapshots/assertions contain redacted placeholders rather than raw credentials
    Evidence: .sisyphus/evidence/task-3-write-safety-error.txt
  ```

  **Commit**: YES | Message: `feat(setup): add safe config preview and write flow` | Files: `src/setup/*`, `tests/setup/*`

- [ ] 4. Orchestrate validation phases using the shared foundation: schema, credentials, and cheap smoke test

  **What to do**: Build setup-phase orchestration over the shared runtime foundation. Validation must run in explicit phases: schema validation, credential check, endpoint/model availability, and cheap smoke test. The cheap smoke test must run once for every unique `providerAlias/modelId` candidate that would be written, using a non-streaming minimal request with `temperature=0`, `maxTokens=32`, timeout `10s`, and no retries. Candidates failing smoke test are removed from the preview with explicit warnings; if no candidates remain, setup aborts without writing. “Save anyway” is forbidden in v1.
  **Must NOT do**: Do not perform provider-specific validation logic inside command IO, do not blur credential checks with smoke tests, and do not write config when validation policy says the flow must stop.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: multi-phase validation semantics over shared provider foundation
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5,6,7 | Blocked By: 1,2

  **References**:
  - Pattern: `.sisyphus/plans/multi-provider-model-config.md` — validation ownership and provider-qualified model refs
  - Pattern: `src/llm/factory.ts` — current runtime error/fallback semantics baseline
  - Pattern: `.env.example` — credential source expectations

  **Acceptance Criteria**:
  - [ ] Validation phases are distinct and independently testable.
  - [ ] Invalid credentials, unavailable models, and smoke-test failures produce different user-facing outcomes.
  - [ ] Smoke-test failures exclude only the failing candidates from preview; if all candidates fail, no config write occurs.
  - [ ] No config write occurs when blocking validation phases fail.

  **QA Scenarios**:
  ```
  Scenario: Validation phases fail independently with distinct outcomes
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-validation-phases.test.ts`
    Expected: tests pass for schema failure, credential failure, unavailable model, and smoke-test timeout as separate cases
    Evidence: .sisyphus/evidence/task-4-validation-phases.txt

  Scenario: Blocking validation prevents config persistence
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-validation-phases.test.ts -t "does not write config when blocking validation fails"`
    Expected: test passes and filesystem assertions show no persisted config was written
    Evidence: .sisyphus/evidence/task-4-validation-phases-error.txt
  ```

  **Commit**: YES | Message: `feat(setup): add validation orchestration for guided config` | Files: `src/setup/*`, shared validation interfaces, `tests/setup/*`

- [ ] 5. Wire the dedicated setup command into the real runtime entrypoint

  **What to do**: Add the `novelist_setup` tool to the actual runtime path, not the passive command stubs. The tool must invoke the guided flow, preview step, validation orchestration, write path, and doctor/report output. It must support a testable non-interactive invocation contract with modes `preview`, `apply`, and `doctor`.
  **Must NOT do**: Do not anchor v1 on `src/commands/*.ts` or `.opencode/commands/*.yaml` unless they are first proven to be the real runtime path. Do not make generic Director chat setup the primary execution surface.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: runtime integration with dead-path avoidance
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6,7 | Blocked By: 2,3,4

  **References**:
  - Pattern: `src/index.ts` — current authoritative runtime wiring
  - Pattern: `src/commands/*.ts` — passive/stubbed today, should not be assumed authoritative
  - Pattern: `.opencode/commands/*.yaml` — passive command definitions today

  **Acceptance Criteria**:
  - [ ] `novelist_setup` is registered on the real runtime path.
  - [ ] `novelist_setup` supports the non-interactive modes `preview`, `apply`, and `doctor` for automated execution.
  - [ ] End-to-end setup can run without requiring manual file edits.

  **QA Scenarios**:
  ```
  Scenario: Dedicated setup command is available through the real runtime path
    Tool: Bash
    Steps: run `npx vitest run tests/agents/setup-command.integration.test.ts -t "registers guided setup command in runtime entrypoint"`
    Expected: test passes and runtime wiring exposes the setup command through the actual plugin entrypoint
    Evidence: .sisyphus/evidence/task-5-setup-command.txt

  Scenario: Setup command executes end-to-end with mocked validation adapters
    Tool: Bash
    Steps: run `npx vitest run tests/agents/setup-command.integration.test.ts -t "runs guided setup end to end with preview validation and report"`
    Expected: test passes and produces preview -> confirm -> validate -> write -> report flow deterministically
    Evidence: .sisyphus/evidence/task-5-setup-command-error.txt
  ```

  **Commit**: YES | Message: `feat(setup): wire guided setup command into runtime` | Files: `src/index.ts`, `src/setup/*`, integration tests

- [ ] 6. Add doctor/report output and help/docs for setup flow

  **What to do**: Implement a doctor-style summary explaining what was configured, what was skipped, what passed validation, what failed, and the next recommended action. Update docs/help text for the setup command, overwrite policy, credential expectations, smoke-test semantics, and troubleshooting.
  **Must NOT do**: Do not expose raw secrets in the report, do not imply unsupported project scaffolding behavior, and do not document passive `.opencode` command files as the setup surface.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: user-facing explanation, help, and troubleshooting docs
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 7 | Blocked By: 4,5

  **References**:
  - Pattern: openagent-style “what got configured and why” explanation
  - Pattern: `README.md`, `CONFIGURATION.md` — current docs surfaces
  - Pattern: `.env.example` — credential/help expectations

  **Acceptance Criteria**:
  - [ ] Doctor/report output is deterministic and redacted.
  - [ ] Help/docs explain overwrite, backup, validation phases, and troubleshooting.
  - [ ] Docs remain aligned with the actual setup command contract.

  **QA Scenarios**:
  ```
  Scenario: Doctor output summarizes configured result without leaking secrets
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-doctor-report.test.ts`
    Expected: tests pass and report output contains configured providers/models, validation outcomes, and next steps with secrets redacted
    Evidence: .sisyphus/evidence/task-6-doctor-report.txt

  Scenario: Help/docs remain aligned with command behavior
    Tool: Bash
    Steps: run `grep -n "llm.config.json\|setup\|backup\|smoke test\|replace" README.md CONFIGURATION.md .env.example`
    Expected: required setup/help terms are present and reflect the implemented behavior
    Evidence: .sisyphus/evidence/task-6-docs-help.txt
  ```

  **Commit**: YES | Message: `docs(setup): add guided setup help and doctor output` | Files: docs/help surfaces, report logic, tests

- [ ] 7. Add end-to-end regression coverage for happy path and major failure paths

  **What to do**: Add automated regression coverage for the full guided setup flow: fresh install, existing config overwrite path, invalid credentials, unavailable model, smoke-test timeout, malformed existing config, and write failure after confirmation. Require evidence artifacts for config output, backup file behavior, and doctor/report output.
  **Must NOT do**: Do not depend on real vendor network calls for broad test coverage and do not leave failure modes covered only by manual testing.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: end-to-end orchestration and failure-path coverage
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 5,6

  **References**:
  - Pattern: `tests/agents/director.smoke.test.ts` — current integration/smoke style
  - Pattern: setup-specific unit/integration tests introduced earlier in this track
  - Pattern: `.sisyphus/plans/multi-provider-model-config.md` — foundation assumptions that setup must consume

  **Acceptance Criteria**:
  - [ ] End-to-end tests cover happy path and major blocking failure paths.
  - [ ] Existing config protection and backup behavior are asserted with filesystem checks.
  - [ ] No failure path leaves ambiguous persisted state.

  **QA Scenarios**:
  ```
  Scenario: Happy path creates config and doctor report from a fresh workspace
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-e2e.test.ts -t "creates config from fresh guided setup flow"`
    Expected: test passes and output fixtures include generated config and doctor summary
    Evidence: .sisyphus/evidence/task-7-setup-e2e.txt

  Scenario: Failure paths do not leave ambiguous persisted state
    Tool: Bash
    Steps: run `npx vitest run tests/setup/setup-e2e.test.ts -t "does not leave partial config or unsafe overwrite on failures"`
    Expected: test passes and filesystem assertions confirm no half-written config remains after failure
    Evidence: .sisyphus/evidence/task-7-setup-e2e-error.txt
  ```

  **Commit**: YES | Message: `test(setup): add guided setup end-to-end coverage` | Files: `tests/setup/*`, fixture helpers, tiny support files only if required

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle

  **What to do**: Oracle audits the completed branch against this plan and verifies that setup orchestration, overwrite safety, validation phases, and docs all match the declared scope and acceptance criteria.
  **Tool/Agent**: `task(subagent_type="oracle")`
  **Approval Condition**: Oracle returns `APPROVE` with no unresolved critical deviations.

  **QA Scenario**:
  ```
  Scenario: Oracle verifies setup branch against this plan
    Tool: task(subagent_type="oracle")
    Steps: provide `.sisyphus/plans/guided-install-and-config.md`, diff summary, and verification outputs; require task-by-task compliance review with APPROVE/REJECT
    Expected: oracle returns APPROVE and no unresolved critical plan deviations remain
    Evidence: .sisyphus/evidence/f1-guided-setup-plan-compliance.txt
  ```

- [ ] F2. Code Quality Review — unspecified-high

  **What to do**: Review the completed setup flow for maintainability, redaction safety, dead-path avoidance, and correct boundary use with the multi-provider foundation.
  **Tool/Agent**: `task(category="unspecified-high")`
  **Approval Condition**: Reviewer returns `APPROVE` with no unresolved critical code-quality issues.

  **QA Scenario**:
  ```
  Scenario: High-effort reviewer checks setup architecture and safety
    Tool: task(category="unspecified-high")
    Steps: review changed files under runtime wiring, setup domain logic, and tests for duplication, safety, and dead command-path regressions
    Expected: reviewer returns APPROVE with no critical maintainability or correctness issues
    Evidence: .sisyphus/evidence/f2-guided-setup-code-quality.txt
  ```

- [ ] F3. Real Manual QA — unspecified-high

  **What to do**: Execute final repo checks and inspect actual setup outputs from automated command/test runs, including overwrite preview, backup behavior, and doctor/report output.
  **Tool/Agent**: `task(category="unspecified-high")`
  **Approval Condition**: Reviewer returns `APPROVE` after successful command execution and artifact inspection.

  **QA Scenario**:
  ```
  Scenario: Real branch verification passes with setup outputs inspected
    Tool: task(category="unspecified-high")
    Steps: run `npm run typecheck`, `npm run build`, `npm test`, and targeted `npx vitest run tests/setup/*.test.ts tests/agents/*.test.ts`; inspect resulting preview/backup/report artifacts
    Expected: reviewer returns APPROVE after commands succeed and setup artifacts match the documented behavior
    Evidence: .sisyphus/evidence/f3-guided-setup-manual-qa.txt
  ```

- [ ] F4. Scope Fidelity Check — deep

  **What to do**: Verify the completed setup feature stayed within v1 scope: no project scaffolding, no generic provider marketplace, no YAML runtime loading, no silent overwrite, and no provider-foundation duplication.
  **Tool/Agent**: `task(category="deep")`
  **Approval Condition**: Reviewer returns `APPROVE` and confirms all v1 scope guardrails were respected.

  **QA Scenario**:
  ```
  Scenario: Deep reviewer confirms forbidden features were not added
    Tool: task(category="deep")
    Steps: review changed files against this plan's Must NOT Have list and emit an explicit scope-compliance verdict
    Expected: reviewer returns APPROVE and confirms no forbidden scope expansions were introduced
    Evidence: .sisyphus/evidence/f4-guided-setup-scope-fidelity.txt
  ```

## Commit Strategy
- Commit after Tasks 1-2: `feat(setup): add guided setup flow contract and state model`
- Commit after Tasks 3-4: `feat(setup): add safe config write and validation orchestration`
- Commit after Task 5: `feat(setup): wire guided setup command into runtime`
- Commit after Tasks 6-7: `docs(setup): add setup doctor docs and end-to-end coverage`

## Success Criteria
- A dedicated guided setup command can produce a valid `llm.config.json` using the shared multi-provider foundation.
- Existing config is never overwritten without preview, confirmation, and defined backup behavior.
- Setup previews and reports redact secrets and explain the configured result clearly.
- Major failure paths leave no ambiguous persisted state and are covered by automated tests.
