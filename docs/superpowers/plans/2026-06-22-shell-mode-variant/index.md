# Shell Mode Variant Implementation Plan

> **For agentic workers:** Default execution route: `subagent-driven-development`. Use `executing-plans` only if the user explicitly prefers inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the selected model variant when users submit shell-mode commands from TUI, web app, SDK, or older API callers.

**Architecture:** Add optional `variant` support to the shell API schema, persist the effective variant on shell-created message metadata, regenerate SDK types, then pass the existing selected variant from both clients. The backend also inherits the current session variant when an older caller omits `variant` and the resolved shell model matches the session model.

**Tech Stack:** TypeScript, Effect schemas, Bun tests, generated JavaScript SDK, Solid TUI, Solid web app.

---

## Task List

| # | Task Title | Task File | Task Status | Blocked By |
|---|------------|-----------|-------------|------------|
| 1 | backend-schema | `task-01-backend-schema.md` | `done` | `none` |
| 2 | shell-metadata | `task-02-shell-metadata.md` | `done` | `1` |
| 3 | regen-sdk | `task-03-regen-sdk.md` | `done` | `1` |
| 4 | client-variant | `task-04-client-variant.md` | `done` | `2, 3` |
| 5 | windows-tests | `task-05-windows-tests.md` | `done` | `4` |
| 6 | final-verify | `task-06-final-verify.md` | `done` | `5` |

## Reference Files

- Spec: `docs/superpowers/specs/2026-06-22-shell-mode-variant-fix-design.md`
- Issue: `docs/isusses/shell-mode-loses-variant.md`
- Backend API/schema: `packages/opencode/src/session/prompt.ts`
- Backend shell tests: `packages/opencode/test/session/prompt.test.ts`
- Backend schema tests: `packages/opencode/test/session/schema-decoding.test.ts`
- Web app submit code: `packages/app/src/components/prompt-input/submit.ts`
- Web app submit tests: `packages/app/src/components/prompt-input/submit.test.ts`
- Web app restore helper tests: `packages/app/src/pages/session/session-model-helpers.test.ts`
- TUI submit code: `packages/tui/src/component/prompt/index.tsx`
- SDK build script: `packages/sdk/js/script/build.ts`

## Execution Notes

- Run tests from package directories, never from the repo root.
- Run `bun typecheck` from affected package directories.
- Do not commit unless the user explicitly asks for commits.
