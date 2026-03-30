# OpenCode-Native Model Policy and Prompt Routing for oh-my-novelist

## TL;DR
> **Summary**: Stop treating oh-my-novelist as a provider-runtime owner. OpenCode remains the sole provider/auth/runtime layer, while oh-my-novelist adds a thin novelist-specific policy layer for model selection, fallback ordering, and model-family prompt routing.
> **Deliverables**:
> - OpenCode-native integration boundary for model execution
> - Plugin-owned policy config for category/agent/family mappings
> - Compatibility shim preserving current Anthropic-first behavior during migration
> - Model-family prompt routing for the same agent role
> - OpenCode-aligned setup/docs/migration guidance
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: policy contract -> failing tests -> OpenCode-backed resolution shim -> prompt-family routing -> Anthropic runtime retirement -> docs/regression

## Context
### Original Request
- Support providers beyond Claude/Anthropic.
- Let users configure model usage through config.
- After review, do **not** rebuild provider support inside the plugin because OpenCode already supports many providers and local models.
- Rewrite the previous plan accordingly.

### Interview Summary
- OpenCode already owns providers, credentials, model discovery, provider config, custom providers, and local model support.
- oh-my-openagent appears to rely on agent-model matching and model-family prompt routing rather than rebuilding provider adapters.
- Therefore oh-my-novelist must own only novelist-specific policy: category/agent model selection, fallback ordering, prompt-family branching, and setup/docs hooks.
- Anthropic-first current behavior should remain the default mapping during migration.
- The plugin must not duplicate provider adapters, provider auth, or generic provider runtime logic.

### Metis Review (gaps addressed)
- Rewrite the plan around **OpenCode owns execution; plugin owns policy**.
- Keep agent-facing call sites stable where possible; migrate internals first.
- Separate **selection-time fallback policy** from **runtime transport/provider fallback**.
- Limit prompt-family routing in v1 to the minimum useful branching rather than a repo-wide prompt rewrite.
- Make config ownership explicit: OpenCode config owns providers/models/runtime options; plugin config owns only policy mappings and optional explicit overrides.

### Oracle Review (architecture verdict incorporated)
- Responsibilities that remain OpenCode-owned: provider adapters, auth flows, transport/runtime execution, provider config schema, `/connect`, `/models`, custom/local provider support.
- Responsibilities that remain plugin-owned: novelist role/category policy, per-agent fallback ordering, model-family prompt paths, OpenCode-aligned setup/docs/validation hooks.
- Migration must first introduce an OpenCode-backed model-resolution boundary, then deprecate direct Anthropic runtime code.

## Work Objectives
### Core Objective
Convert the current Anthropic-only runtime implementation into an OpenCode-native model policy layer, so the plugin no longer owns provider runtimes and instead chooses models and prompts through novelist-specific routing on top of OpenCode.

### Deliverables
- Plugin policy config contract separate from OpenCode provider/runtime config
- OpenCode-backed model resolution boundary
- Compatibility shim that preserves current Anthropic defaults during migration
- Minimal model-family prompt routing (same agent, different prompt path by family)
- Regression coverage for policy precedence, fallback ordering, OpenCode resolution, and OpenAI secondary-path proof
- Updated setup and migration docs pointing users to OpenCode-native provider flows

### Definition of Done (verifiable conditions with commands)
- `npm run typecheck` exits 0.
- `npm run build` exits 0.
- `npm test` exits 0.
- `npx vitest run tests/llm/*.test.ts tests/prompts/*.test.ts tests/agents/*.test.ts` exits 0.
- The plugin no longer requires direct provider-specific runtime ownership for its primary path.
- With no new policy config, current Anthropic-first behavior remains the default mapping.
- `openai/gpt-4o-mini` resolves through the OpenCode-native boundary in tests.
- The same agent can select different prompt paths when the resolved model family changes.

### Must Have
- OpenCode remains the only provider/auth/runtime owner
- Plugin-owned policy config limited to novelist role/category/family mappings and optional explicit model overrides
- Anthropic compatibility shim during migration
- Explicit precedence between global/category/agent policy and explicit override
- Minimal family-based prompt routing
- OpenCode-aligned docs and migration path

### Default Operational Policy
- Plugin policy config surface for v1: repo-root `oh-my-novelist.jsonc`
- OpenCode config remains the source of truth for providers, auth, model catalogs, and runtime/provider options
- v1 prompt-family routing scope: `claude` family vs `gpt` family only
- v1 secondary proof path beyond Anthropic: `openai/gpt-4o-mini`
- Plugin fallback responsibility: order policy candidates and explicit overrides only
- OpenCode runtime responsibility: transport execution, provider/runtime failure handling, and provider-native retry behavior after a concrete model is selected

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No provider adapter registry implemented inside the plugin
- No provider auth duplication
- No plugin-owned provider discovery or model catalog sync
- No generic provider platform or marketplace work
- No YAML runtime loading as the new primary config source
- No broad prompt rewrite for every agent/model combination in v1
- No silent change in default Anthropic behavior during migration
- No implicit fallback semantics

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after + Vitest
- QA policy: Every task has executable scenarios with exact commands
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: policy contract, failing tests, compatibility defaults
Wave 2: OpenCode-backed resolution boundary, prompt-family routing, legacy runtime retirement
Wave 3: docs/migration/setup alignment, integration/regression hardening

### Dependency Matrix (full, all tasks)
- 1 blocks 2,3,4,5,6,7
- 2 blocks 3,4,5,6,7
- 3 blocks 4,5,6,7
- 4 blocks 5,6,7
- 5 blocks 6,7
- 6 blocks 7

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 -> 2 tasks -> deep, unspecified-high
- Wave 2 -> 3 tasks -> unspecified-high, deep
- Wave 3 -> 2 tasks -> writing, unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Define the OpenCode-native policy boundary and plugin-owned config contract

  **What to do**: Replace the old plugin-owned provider-runtime architecture with a strict boundary document and code contract. OpenCode config remains authoritative for providers, auth, concrete model definitions, and runtime options. The plugin introduces only a policy contract in repo-root `oh-my-novelist.jsonc` for novelist-specific model routing: `global default -> category policy -> agent policy -> explicit override`, plus optional model-family mappings. Keep it limited to policy only.
  **Must NOT do**: Do not store provider credentials, provider options, base URLs, transport settings, or provider registry definitions in plugin config.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: ownership boundary and migration contract definition
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5,6,7 | Blocked By: none

  **References**:
  - Pattern: `src/llm/types.ts` — existing plugin-facing model candidate/response types
  - Pattern: `src/llm/chains.ts` — current hardcoded plugin-owned selection logic to shrink
  - Pattern: `src/llm/factory.ts` — current plugin-owned runtime path to demote
  - External: `https://opencode.ai/docs/ko/providers/` — OpenCode provider ownership and `/connect`/`/models` model

  **Acceptance Criteria**:
  - [ ] The new contract explicitly separates OpenCode-owned config from plugin-owned policy config.
  - [ ] Plugin-owned config contains only policy mappings and optional explicit model overrides.
  - [ ] The selected config surface is fixed to repo-root `oh-my-novelist.jsonc` and documented in the plan/comments/tests.

  **QA Scenarios**:
  ```
  Scenario: Policy contract compiles without provider-runtime duplication
    Tool: Bash
    Steps: run `npx vitest run tests/llm/policy-boundary.test.ts`
    Expected: tests pass and assert plugin config schema excludes provider credentials/runtime options
    Evidence: .sisyphus/evidence/task-1-policy-boundary.txt

  Scenario: Invalid plugin policy config is rejected deterministically
    Tool: Bash
    Steps: run `npx vitest run tests/llm/policy-boundary.test.ts -t "rejects provider runtime fields in plugin policy config"`
    Expected: test passes and validation rejects forbidden provider-owned fields
    Evidence: .sisyphus/evidence/task-1-policy-boundary-error.txt
  ```

  **Commit**: YES | Message: `feat(policy): define opencode-native model policy contract` | Files: `src/llm/*`, new policy config module(s), `tests/llm/*`

- [ ] 2. Add failing regression tests for legacy defaults, policy precedence, and OpenCode-backed resolution

  **What to do**: Encode the migration contract in tests before changing runtime internals. Add failing tests for: preserved Anthropic-first default mapping when no new policy exists, explicit precedence rules, unavailable override behavior, one OpenAI secondary resolution path using `openai/gpt-4o-mini`, and the absence of plugin-owned provider dispatch.
  **Must NOT do**: Do not delete Anthropic runtime code first; prove the replacement path with tests before removing legacy behavior.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: TDD scaffolding across policy and migration boundaries
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3,4,5,6,7 | Blocked By: 1

  **References**:
  - Pattern: `tests/llm/chains.test.ts` — current selection test style
  - Pattern: `tests/llm/resilient.test.ts` — current runtime resilience baseline
  - Pattern: `tests/agents/director.smoke.test.ts` — existing integration baseline

  **Acceptance Criteria**:
  - [ ] Tests exist for preserved Anthropic default mapping, policy precedence, unavailable override semantics, and one OpenAI secondary path using `openai/gpt-4o-mini`.
  - [ ] Tests fail before the new OpenCode-backed resolution implementation lands.
  - [ ] Tests assert the plugin no longer owns primary provider dispatch logic.

  **QA Scenarios**:
  ```
  Scenario: Legacy Anthropic default stays green until migration completes
    Tool: Bash
    Steps: run `npx vitest run tests/llm/opencode-resolution.test.ts -t "preserves anthropic default mapping without new policy config"`
    Expected: initially failing test encodes legacy-default expectation before implementation
    Evidence: .sisyphus/evidence/task-2-legacy-default-test.txt

  Scenario: Policy precedence and unavailable override are encoded before implementation
    Tool: Bash
    Steps: run `npx vitest run tests/llm/opencode-resolution.test.ts -t "applies agent override precedence and handles unavailable override"`
    Expected: failing test defines exact precedence and fallback/failure behavior
    Evidence: .sisyphus/evidence/task-2-policy-precedence-test.txt
  ```

  **Commit**: YES | Message: `test(policy): add opencode-native routing migration specs` | Files: `tests/llm/*`, `tests/agents/*` if tiny integration fixture needed

- [ ] 3. Introduce an OpenCode-backed model resolution shim behind the existing plugin-facing API

  **What to do**: Add a new internal boundary that resolves the model to use through OpenCode-native configuration and selected model identity, while preserving the plugin-facing `LLMClient.generate(agentType, prompt, context)` usage pattern if possible. The shim should translate novelist policy into an OpenCode-backed resolved model identity instead of calling provider-specific plugin clients directly.
  **Must NOT do**: Do not reintroduce provider adapters or transport execution inside the plugin. Do not bypass the shim from agents.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: runtime-boundary replacement with compatibility shim
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 4,5,6,7 | Blocked By: 2

  **References**:
  - Pattern: `src/llm/factory.ts` — current runtime boundary to replace
  - Pattern: `src/index.ts` — runtime bootstrap path
  - Pattern: `src/agents/base.ts`, `src/agents/*.ts` — stable agent-facing call pattern to preserve

  **Acceptance Criteria**:
  - [ ] Primary model resolution path is OpenCode-backed rather than direct provider dispatch.
  - [ ] Agent call sites remain stable or change minimally and uniformly.
  - [ ] Legacy Anthropic mapping remains available as the default policy when no new policy config is present.

  **QA Scenarios**:
  ```
  Scenario: OpenCode-backed resolution is used for primary path
    Tool: Bash
    Steps: run `npx vitest run tests/llm/opencode-resolution.test.ts -t "uses opencode-backed model resolution for generation"`
    Expected: test passes and no direct plugin-owned provider dispatch path is used for the primary route
    Evidence: .sisyphus/evidence/task-3-opencode-resolution.txt

  Scenario: Default Anthropic mapping still works during compatibility phase
    Tool: Bash
    Steps: run `npx vitest run tests/llm/opencode-resolution.test.ts -t "keeps anthropic as default mapping during migration"`
    Expected: test passes and legacy default remains stable without new policy config
    Evidence: .sisyphus/evidence/task-3-opencode-resolution-legacy.txt
  ```

  **Commit**: YES | Message: `feat(llm): add opencode-backed model resolution shim` | Files: `src/llm/*`, `src/index.ts` if bootstrap changes are needed, `tests/llm/*`

- [ ] 4. Add minimal model-family prompt routing for shared agent roles

  **What to do**: Introduce prompt-family branching so the same novelist agent role can use different prompt paths depending on the resolved model family. Scope v1 narrowly: implement only `claude` family vs `gpt` family routing. Route through the prompt loader/builder layer rather than scattering family checks across agents.
  **Must NOT do**: Do not rewrite every prompt file for every family in v1, and do not hardcode provider checks inside individual agents.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: controlled prompt-path branching without prompt explosion
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5,6,7 | Blocked By: 3

  **References**:
  - Pattern: `src/prompts/loader.ts`, `src/prompts/builder.ts` — existing prompt pipeline to extend
  - Pattern: `src/agents/prompts/*.md` — current single-path prompt assets
  - Pattern: related OpenCode-native tools using dual-prompt/family-based routing

  **Acceptance Criteria**:
  - [ ] At least one agent role switches prompt path based on resolved `claude` vs `gpt` family.
  - [ ] Family routing is centralized in prompt infrastructure rather than duplicated in many agents.
  - [ ] Family routing preserves existing prompt behavior for Anthropic default mapping until explicitly changed.

  **QA Scenarios**:
  ```
  Scenario: Same agent role uses different prompt path for different model families
    Tool: Bash
    Steps: run `npx vitest run tests/prompts/model-family-routing.test.ts`
    Expected: tests pass and assert different prompt assets or branches are selected for `claude` vs `gpt` family routing
    Evidence: .sisyphus/evidence/task-4-model-family-routing.txt

  Scenario: Anthropic default keeps existing prompt path when no family override is configured
    Tool: Bash
    Steps: run `npx vitest run tests/prompts/model-family-routing.test.ts -t "preserves default prompt path for anthropic mapping"`
    Expected: test passes and existing prompt path remains unchanged for legacy default family
    Evidence: .sisyphus/evidence/task-4-model-family-routing-legacy.txt
  ```

  **Commit**: YES | Message: `feat(prompts): add minimal model-family prompt routing` | Files: `src/prompts/*`, selected prompt assets, `tests/prompts/*`

- [ ] 5. Retire direct Anthropic runtime ownership behind compatibility shims

  **What to do**: After OpenCode-backed resolution is proven, remove or demote direct Anthropic-only runtime ownership from the plugin. Rework `src/llm/anthropic-client.ts`, `src/llm/factory.ts`, and `src/llm/chains.ts` so they no longer define the plugin’s long-term primary execution path. Preserve only the minimum compatibility code needed during transition, and document its planned removal point.
  **Must NOT do**: Do not leave two equal primary runtime paths in place, and do not silently break offline/error behavior while removing Anthropic-specific code.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: legacy-runtime retirement with regression risk
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6,7 | Blocked By: 3,4

  **References**:
  - Pattern: `src/llm/anthropic-client.ts` — legacy direct provider client
  - Pattern: `src/llm/factory.ts` — legacy provider dispatch bootstrap
  - Pattern: `src/llm/chains.ts` — legacy hardcoded model candidates
  - Pattern: `tests/llm/resilient.test.ts` — existing offline/fallback behavior to preserve

  **Acceptance Criteria**:
  - [ ] Direct Anthropic runtime code is no longer the plugin’s primary path.
  - [ ] Compatibility behavior is documented and bounded.
  - [ ] Offline/error behavior remains covered and green after retirement work.

  **QA Scenarios**:
  ```
  Scenario: Legacy Anthropic runtime is no longer the primary execution path
    Tool: Bash
    Steps: run `npx vitest run tests/llm/runtime-retirement.test.ts -t "uses compatibility shim instead of primary anthropic runtime"`
    Expected: test passes and confirms old Anthropic transport path is no longer primary
    Evidence: .sisyphus/evidence/task-5-runtime-retirement.txt

  Scenario: Offline and error behavior remains intact after retirement changes
    Tool: Bash
    Steps: run `npx vitest run tests/llm/resilient.test.ts`
    Expected: resilience tests pass without reintroducing plugin-owned provider runtime coupling
    Evidence: .sisyphus/evidence/task-5-runtime-retirement-error.txt
  ```

  **Commit**: YES | Message: `refactor(llm): retire direct anthropic runtime ownership` | Files: `src/llm/*`, `tests/llm/*`

- [ ] 6. Rewrite setup, configuration, and migration docs around OpenCode-native ownership

  **What to do**: Update docs so users configure providers through OpenCode-native mechanisms (`/connect`, `/models`, provider config), while the plugin documents only novelist-specific policy/routing configuration and defaults. Explain the migration from direct Anthropic plugin runtime to OpenCode-backed selection.
  **Must NOT do**: Do not document provider setup as plugin-owned, and do not keep stale `llm.config.json` provider-runtime guidance from the old plan.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: docs and migration clarity
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 7 | Blocked By: 5

  **References**:
  - Pattern: `README.md`, `CONFIGURATION.md`, `.env.example` — existing user-facing setup docs
  - External: `https://opencode.ai/docs/ko/providers/` — provider ownership baseline

  **Acceptance Criteria**:
  - [ ] Docs instruct users to configure providers via OpenCode, not via plugin-owned provider settings.
  - [ ] Docs explain plugin policy config and model-family routing clearly.
  - [ ] Docs preserve legacy Anthropic migration guidance during transition.

  **QA Scenarios**:
  ```
  Scenario: Docs reflect OpenCode-native provider ownership
    Tool: Bash
    Steps: run `grep -n "connect\|models\|OpenCode\|Anthropic\|policy" README.md CONFIGURATION.md .env.example`
    Expected: docs clearly point provider setup to OpenCode and plugin config to policy/routing only
    Evidence: .sisyphus/evidence/task-6-docs-open-code.txt

  Scenario: Stale plugin-owned provider runtime guidance is removed
    Tool: Bash
    Steps: run `npx vitest run tests/agents/docs-migration.test.ts -t "rejects stale plugin owned provider setup guidance"`
    Expected: test or doc assertion passes and old provider-runtime instructions are no longer present
    Evidence: .sisyphus/evidence/task-6-docs-open-code-error.txt
  ```

  **Commit**: YES | Message: `docs(config): migrate model setup guidance to opencode-native flow` | Files: docs/help/config files and any doc tests

- [ ] 7. Add end-to-end regression proof for one OpenAI secondary path

  **What to do**: Add integration coverage proving the design is real rather than nominal. Keep Anthropic as the default path, but prove that `openai/gpt-4o-mini` works as a secondary route through OpenCode-backed selection and the same agent can still run with the correct prompt branch.
  **Must NOT do**: Do not claim full provider coverage, and do not rely on broad live-network test suites.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: integration proof across routing, prompt selection, and migration behavior
  - Skills: `[]`
  - Omitted: `['git-master']`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 5,6

  **References**:
  - Pattern: `tests/agents/director.smoke.test.ts` — smoke/integration baseline
  - Pattern: tasks 2-5 introduced tests and shims
  - External: OpenCode provider/local model support docs

  **Acceptance Criteria**:
  - [ ] Tests prove `openai/gpt-4o-mini` resolves and runs through the new OpenCode-backed boundary.
  - [ ] The selected agent still receives the expected prompt-family path.
  - [ ] Failure-path tests prove unavailable overrides do not silently misroute.

  **QA Scenarios**:
  ```
  Scenario: OpenAI secondary provider path resolves through OpenCode-native boundary
    Tool: Bash
    Steps: run `npx vitest run tests/agents/opencode-integration.smoke.test.ts -t "runs openai gpt 4o mini through policy resolution"`
    Expected: test passes and shows the plugin can resolve and execute `openai/gpt-4o-mini` through OpenCode-native selection
    Evidence: .sisyphus/evidence/task-7-opencode-secondary-path.txt

  Scenario: Unavailable override does not silently misroute
    Tool: Bash
    Steps: run `npx vitest run tests/agents/opencode-integration.smoke.test.ts -t "fails or falls back deterministically when override is unavailable"`
    Expected: test passes and behavior matches declared precedence/fallback semantics exactly
    Evidence: .sisyphus/evidence/task-7-opencode-secondary-path-error.txt
  ```

  **Commit**: YES | Message: `test(integration): prove opencode-native secondary model path` | Files: `tests/agents/*`, `tests/llm/*`, tiny fixture helpers only if required

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle

  **What to do**: Oracle verifies the completed branch matches this revised OpenCode-native plan and confirms provider-runtime ownership stayed with OpenCode.
  **Tool/Agent**: `task(subagent_type="oracle")`
  **Approval Condition**: Oracle returns `APPROVE` with no unresolved critical deviations.

  **QA Scenario**:
  ```
  Scenario: Oracle audits revised plan compliance
    Tool: task(subagent_type="oracle")
    Steps: provide `.sisyphus/plans/multi-provider-model-config.md`, diff summary, and verification outputs; require task-by-task compliance review with explicit ownership-boundary checks
    Expected: oracle returns APPROVE and confirms no plugin-owned provider runtime work remains beyond declared compatibility shims
    Evidence: .sisyphus/evidence/f1-opencode-native-plan-compliance.txt
  ```

- [ ] F2. Code Quality Review — unspecified-high

  **What to do**: Review the completed migration for clean OpenCode/plugin boundaries, maintainable policy logic, and controlled prompt-family routing scope.
  **Tool/Agent**: `task(category="unspecified-high")`
  **Approval Condition**: Reviewer returns `APPROVE` with no unresolved critical code-quality issues.

  **QA Scenario**:
  ```
  Scenario: Reviewer checks code quality and ownership boundaries
    Tool: task(category="unspecified-high")
    Steps: review changed LLM, prompt, bootstrap, and config files for duplication, leaked provider logic, or prompt-branch explosion
    Expected: reviewer returns APPROVE and identifies no critical maintainability or correctness issues
    Evidence: .sisyphus/evidence/f2-opencode-native-code-quality.txt
  ```

- [ ] F3. Real Manual QA — unspecified-high

  **What to do**: Execute final repo checks and inspect actual outputs proving Anthropic-default compatibility, OpenCode-backed resolution, and second-provider/local proof path.
  **Tool/Agent**: `task(category="unspecified-high")`
  **Approval Condition**: Reviewer returns `APPROVE` after successful command execution and output inspection.

  **QA Scenario**:
  ```
  Scenario: Real branch verification passes with OpenCode-native artifacts inspected
    Tool: task(category="unspecified-high")
    Steps: run `npm run typecheck`, `npm run build`, `npm test`, and targeted `npx vitest run tests/llm/*.test.ts tests/prompts/*.test.ts tests/agents/*.test.ts`; inspect evidence for default mapping, family routing, and secondary/local path
    Expected: reviewer returns APPROVE after all commands succeed and outputs match the revised plan behavior
    Evidence: .sisyphus/evidence/f3-opencode-native-manual-qa.txt
  ```

- [ ] F4. Scope Fidelity Check — deep

  **What to do**: Verify the completed work stayed within the revised scope: no provider runtime rebuild, no auth duplication, no generic provider platform, and no uncontrolled prompt rewrite.
  **Tool/Agent**: `task(category="deep")`
  **Approval Condition**: Reviewer returns `APPROVE` and confirms the revised scope guardrails were respected.

  **QA Scenario**:
  ```
  Scenario: Deep reviewer confirms revised scope fidelity
    Tool: task(category="deep")
    Steps: review changed files against the Must NOT Have list and the OpenCode/plugin ownership split
    Expected: reviewer returns APPROVE and confirms no forbidden provider-runtime scope expansion was introduced
    Evidence: .sisyphus/evidence/f4-opencode-native-scope-fidelity.txt
  ```

## Commit Strategy
- Commit after Tasks 1-2: `test(policy): define opencode-native routing contract and migration specs`
- Commit after Task 3: `feat(llm): add opencode-backed model resolution shim`
- Commit after Tasks 4-5: `refactor(llm): route prompts and runtime through opencode-native policy`
- Commit after Tasks 6-7: `docs(config): migrate to opencode-native model setup and prove secondary path`

## Success Criteria
- The plugin no longer owns provider-runtime implementation as its primary path.
- Anthropic remains the default model mapping during migration unless policy config says otherwise.
- Policy precedence and fallback semantics are explicit, tested, and deterministic.
- `openai/gpt-4o-mini` is proven as a secondary path through the OpenCode-native boundary.
- Prompt-family routing works for the same agent role without exploding prompt complexity.
