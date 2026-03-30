# Cleanup Duplicate Agents and Legacy - Learnings

## Task 1: Baseline Verification and Keep-Set Freeze

### Date: 2025-03-30

---

### Baseline Health Check

All baseline verification commands passed successfully:

| Command | Exit Code | Status |
|---------|-----------|--------|
| `npm test` | 0 | PASS - 13 test files, 109 tests |
| `npm run typecheck` | 0 | PASS - No TypeScript errors |
| `npm run build` | 0 | PASS - Build completed |

Evidence files:
- `.sisyphus/evidence/task-1-baseline-test.txt`
- `.sisyphus/evidence/task-1-baseline-typecheck.txt`
- `.sisyphus/evidence/task-1-baseline-build.txt`

---

### Protected Keep-Set (Frozen)

The following files are protected and will NOT be modified except for direct reference cleanup required by deletions:

**Core Runtime:**
- `src/index.ts` - Plugin entrypoint, agent instantiation, policy loading
- `src/agents/*.ts` - All 9 agent implementations
- `src/agents/prompts/*.md` - Agent system prompts
- `src/prompts/*` - Prompt loading system
- `src/context/*` - Context management

**Configuration & LLM:**
- `src/config/policy.ts` - Policy configuration loading
- `src/llm/*` - LLM client and model resolution

**Tools:**
- `src/tools/todo-manager.ts` - Active todo management tool
- `src/tools/index.ts` - Tool exports (will be updated in Task 2 to remove stub references)

**Project Files:**
- `package.json` - Dependencies and scripts
- `oh-my-novelist.jsonc` - Official policy configuration file

---

### Deletion Set (To Be Removed)

**Wave 2 - Independent Removals:**
1. `.opencode/*` - Duplicate system-agent surface
2. `src/commands/*` - Dead command surface
3. `src/tools/obsidian-vault.ts` - Stub tool
4. `src/tools/template-generator.ts` - Stub tool
5. `skills/novel-writing/*` - Legacy skill surface

**Wave 3 - Doc Cleanup:**
6. `docs/ADOPTION_ANALYSIS.md` - Obsolete doc (references deleted surfaces)
7. `docs/TEST_SIMULATION.md` - Obsolete doc
8. `docs/LLM_INTEGRATION_PLAN.md` - Obsolete doc
9. `docs/LLM_INTEGRATION_PLAN2.md` - Obsolete doc
10. `README.md` - Update to remove references to deleted surfaces
11. `CONFIGURATION.md` - Update to remove .opencode/agents/ references

---

### Hidden Dependency Analysis

Search command: `git grep -nE '\.opencode|src/commands/|obsidian-vault|template-generator|skills/novel-writing'`

**Findings:**

1. **No hidden supported workflows found in keep-set**
   - All matches are either in the deletion set or in docs scheduled for update
   - No runtime-critical dependencies on deletion targets

2. **Expected cleanup work identified:**
   - `src/tools/index.ts` exports obsidian-vault and template-generator
   - This is expected and will be handled in Task 2 (Remove dead internal tool stubs)

3. **False positive identified:**
   - `src/llm/factory.ts` references `opencodeClient`
   - This is the OpenCode SDK client interface (part of active runtime)
   - NOT related to the `.opencode/` directory deletion target
   - **Action: No change needed** - keep as part of runtime

4. **Doc cleanup targets confirmed:**
   - `docs/ADOPTION_ANALYSIS.md` - Multiple references to deletion set
   - `CONFIGURATION.md:338` - References `.opencode/agents/` structure

---

### Deferral Decisions

**None required.** 

No hidden supported workflows were discovered outside the planned cleanup scope. All references in keep-set files are accounted for and will be handled by the planned cleanup tasks:
- Task 2 will update `src/tools/index.ts` to remove stub tool exports
- Task 6 will clean docs to remove obsolete references

---

### Next Steps

Ready to proceed with Wave 2 parallel removals:
- Task 2: Remove dead internal tool stubs (READY)
- Task 3: Remove dead command surface (READY)
- Task 4: Remove legacy skill surface (READY)
- Task 5: Remove duplicate .opencode/ surface (READY)

All four tasks can proceed in parallel as they have no dependencies on each other.
