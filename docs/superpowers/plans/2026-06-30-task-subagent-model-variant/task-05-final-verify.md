# Task 5: Final Verify

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `docs/superpowers/plans/2026-06-30-task-subagent-model-variant/index.md`
- Verify: `packages/opencode/src/tool/task.ts`
- Verify: `packages/opencode/src/tool/task.txt`
- Verify: `packages/opencode/src/cli/cmd/run/types.ts`
- Verify: `packages/opencode/src/cli/cmd/run/subagent-data.ts`
- Verify: `packages/opencode/src/cli/cmd/run/footer.view.tsx`
- Verify: `packages/opencode/test/tool/task.test.ts`
- Verify: `packages/opencode/test/cli/run/subagent-data.test.ts`

- [ ] **Step 1: Run focused tests**

Run from `packages/opencode`:

```sh
bun test test/tool/task.test.ts test/cli/run/subagent-data.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run package typecheck**

Run from `packages/opencode`:

```sh
bun typecheck
```

Expected: PASS.

- [ ] **Step 3: Check whitespace and patch hygiene**

Run from the repo root:

```sh
git diff --check
```

Expected: no output.

- [ ] **Step 4: Inspect the final diff**

Run from the repo root:

```sh
git diff -- packages/opencode/src/tool/task.ts packages/opencode/src/tool/task.txt packages/opencode/src/cli/cmd/run/types.ts packages/opencode/src/cli/cmd/run/subagent-data.ts packages/opencode/src/cli/cmd/run/footer.view.tsx packages/opencode/test/tool/task.test.ts packages/opencode/test/cli/run/subagent-data.test.ts
```

Expected review points:

- `TaskTool` distinguishes parent-session injection variant from child task variant.
- Explicit `params.model` never inherits the parent variant.
- Parent session variant fallback only applies when inheriting the parent assistant message model.
- Task metadata carries the effective child model and omits default variant.
- TUI subagent tab model metadata is normalized before display.
- Existing status-line model renderer is reused for subagent variants.

- [ ] **Step 5: Update task statuses in the plan index**

After all tasks are complete and verified, update `docs/superpowers/plans/2026-06-30-task-subagent-model-variant/index.md` so every task row has `Task Status` set to `done`:

```markdown
| 1 | task-model | `task-01-task-model.md` | `done` | `none` |
| 2 | task-fallback | `task-02-task-fallback.md` | `done` | `1` |
| 3 | subagent-data | `task-03-subagent-data.md` | `done` | `2` |
| 4 | footer-display | `task-04-footer-display.md` | `done` | `3` |
| 5 | final-verify | `task-05-final-verify.md` | `done` | `4` |
```

- [ ] **Step 6: Report completion**

Final response should include:

- Files changed.
- Tests run and results.
- Any tests not run and why.
- Whether a commit was created. Do not commit unless the user explicitly asks.
