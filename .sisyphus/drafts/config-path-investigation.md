# Draft: Config Path Investigation

## Requirements (confirmed)
- Determine whether agent model selection is actually following repo-root `oh-my-novelist.jsonc` or `~/.config/opencode/oh-my-novelist.json`.
- Base the answer on actual runtime path resolution, not intended architecture alone.
- Explain whether the current behavior is correct.
- Determine why OpenCode system agents with the same names as the project agents (`director`, `editor`, etc.) exist in the first place.

## Technical Decisions
- Treat this as a runtime-behavior investigation, not an implementation task.
- Verify both source and built output paths before drawing conclusions.

## Research Findings
- `src/index.ts` loads policy with `loadPluginPolicyConfig(directory)`.
- `src/config/policy.ts` reads only `join(directory, "oh-my-novelist.jsonc")`.
- `dist/index.js` and `dist/config/policy.js` match the same repo/workspace-relative `.jsonc` behavior.
- `~/.config/opencode/oh-my-novelist.json` exists and contains OpenCode agent/category model settings separate from plugin repo policy.
- The plugin codebase has no direct read path for `~/.config/opencode/oh-my-novelist.json`; any effect from that file must come from OpenCode-level behavior or from `directory` resolving into that location at runtime.
- Explore-agent findings indicate `PluginInput.directory` is likely the active working directory/workspace root, not the plugin source directory.
- Therefore the authoritative file for plugin-internal policy is `{PluginInput.directory}/oh-my-novelist.jsonc`, not the plugin install path.
- User confirmed the observed session was opened in the OpenCode `Editor/system` agent chat, not a clearly isolated oh-my-novelist plugin-only execution surface.
- Shared-session evidence showed `Editor/system · kimi-k2.5` metadata and upstream orchestration text, which is more consistent with OpenCode global/system agent execution than with a clean plugin-internal EditorAgent-only path.

## Open Questions
- Is the plugin being invoked indirectly inside an OpenCode system-agent chat where the outer agent/model metadata dominates the session?
- What is the cleanest user-facing execution surface for validating plugin-internal model resolution without OpenCode system-agent interference?
- Were the same-named system agents created manually, by a setup script, by prior documentation flow, or by another plugin/config import path?

## Scope Boundaries
- INCLUDE: runtime path investigation, installed-path checks, config precedence explanation
- EXCLUDE: code changes until root cause is confirmed
