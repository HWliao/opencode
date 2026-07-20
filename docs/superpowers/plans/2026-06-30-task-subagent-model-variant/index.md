# Task Subagent Model Variant Implementation Plan

> **For agentic workers:** Default execution route: `subagent-driven-development`. Use `executing-plans` only if the user explicitly prefers inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve and display task subagent model variants, and let the `task` tool accept an explicit atomic model selection.

**Architecture:** Keep variant inheritance scoped to `TaskTool`, add a small parser/validator for the new optional `model` parameter, persist the effective child model in task metadata, then let TUI subagent state feed the existing bottom status-line model renderer. The global prompt path is not changed.

**Tech Stack:** TypeScript, Effect services, Bun tests, Solid TUI, opencode run footer state.

---

## Task List

| # | Task Title | Task File | Task Status | Blocked By |
|---|------------|-----------|-------------|------------|
| 1 | task-model | `task-01-task-model.md` | `done` | `none` |
| 2 | task-fallback | `task-02-task-fallback.md` | `done` | `1` |
| 3 | subagent-data | `task-03-subagent-data.md` | `done` | `2` |
| 4 | footer-display | `task-04-footer-display.md` | `done` | `3` |
| 5 | final-verify | `task-05-final-verify.md` | `done` | `4` |

## Reference Files

- Spec: `docs/superpowers/specs/2026-06-30-task-subagent-model-variant-design.md`
- Issue: `docs/isusses/task-subagent-loses-model-variant.md`
- Task tool: `packages/opencode/src/tool/task.ts`
- Task tests: `packages/opencode/test/tool/task.test.ts`
- Provider service: `packages/opencode/src/provider/provider.ts`
- Run subagent reducer: `packages/opencode/src/cli/cmd/run/subagent-data.ts`
- Run shared types: `packages/opencode/src/cli/cmd/run/types.ts`
- Run footer view: `packages/opencode/src/cli/cmd/run/footer.view.tsx`
- Run variant helpers: `packages/opencode/src/cli/cmd/run/variant.shared.ts`
- Subagent reducer tests: `packages/opencode/test/cli/run/subagent-data.test.ts`

## Execution Notes

- Run tests from `packages/opencode`, never from the repo root.
- Run `bun typecheck` from `packages/opencode`.
- Do not edit generated SDK files for this change; the `task` tool schema is server runtime metadata, not public HTTP API schema.
- Do not commit unless the user explicitly asks for commits.
