# Draft: Guided Install and Config

## Requirements (confirmed)
- Evaluate whether oh-my-openagent-style guided installation should be adopted.
- Evaluate whether AI-assisted model availability checks and config-file generation should be adopted.
- This work should be planned as a separate track from the multi-provider runtime/config rollout.
- Guided setup should use a dedicated setup command.
- If `llm.config.json` exists, default behavior is preview + explicit replace confirmation.
- v1 validation depth should include schema validation, credential checks, and a cheap smoke test when supported.

## Technical Decisions
- Planning/recommendation only at this step.
- Recommended default scope for v1 of this track: guided setup interview, `llm.config.json` generation, provider/credential/endpoint verification, and explanation of configured result.
- Exclude broader novelist project scaffolding from this track by default.

## Research Findings
- Local repo has command entrypoints under `src/commands/` including `novel-new`, `novel-continue`, `novel-todo`, `novel-stats`, `novel-export`.
- Actual runtime entrypoints are in `src/index.ts`: `novelist_init_project`, `novelist_todo`, and Director chat routing. Most `src/commands/*.ts` files are stubs and are not wired into runtime.
- `.opencode/config.yaml` already contains rich category/model/command patterns, but current runtime does not load or execute them.
- `oh-my-openagent` installation flow is valuable primarily for: AI-assisted subscription/provider probing, guided config generation, verification (`doctor`) flow, and explanation of the resulting setup.
- The transferable parts are product-agnostic: guided setup interview, config creation from detected availability, validation/doctor step, and “what got configured and why” explanation.
- The risky parts to copy literally are openagent-specific: large provider marketplace assumptions, CLI-heavy flow, code-domain categories, and excessive agent/model complexity.
- Current runtime entrypoints are `novelist_init_project`, `novelist_todo`, and Director chat routing; any guided setup feature should attach to one of these surfaces or a new dedicated setup entrypoint.
- `.opencode/commands/*.yaml` and `src/commands/*.ts` currently do not provide a real runtime setup flow, so guided setup needs an explicit execution surface rather than assuming existing command wiring.
- Best-fit v1 adaptation is a consumer layer over the multi-provider config foundation, not a separate provider architecture.

## Open Questions
- Should guided setup become a first-run command, a slash command, or documentation-driven AI workflow?
- Should config generation create only `llm.config.json`, or broader novelist project setup too?
- Should model availability checks be provider-specific probes, credential checks, or both?
- Should this be folded into the existing multi-provider config rollout, or planned as a separate follow-up track?
- What is the overwrite policy when `llm.config.json` already exists?
- How deep should validation go in v1: schema only, credential check, or cheap model smoke test?

## Technical Decisions (confirmed)
- This will be planned as a separate follow-up track.
- The guided setup flow will be anchored on a dedicated setup command rather than passive docs or generic Director chat.

## Scope Boundaries
- INCLUDE: installation guidance, AI-assisted setup flow, config generation, fit-for-purpose adaptation
- EXCLUDE: implementation until planning is complete
