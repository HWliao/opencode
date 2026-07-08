# TUI Project Management Implementation Plan

> **For agentic workers:** REQUIRED INTERNAL MODULE: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add keyboard-first TUI project listing, switching, and project opening without restarting the TUI process.

**Architecture:** Add a side-effect-free server directory browse API, regenerate client SDK types, then implement TUI soft project switching and two dialogs: project list and add project. The TUI uses `/projects` for entry, stores no separate project history, and only creates or updates project records when the user confirms a project directory.

**Tech Stack:** Effect HttpApi, Bun tests, generated `@opencode-ai/sdk/v2`, SolidJS TUI components, OpenTUI `DialogSelect`, repository `bun typecheck` from package directories.

## Global Constraints

- Spec source: `docs/superpowers/specs/2026-07-08-tui-project-management-design.md`.
- Do not add project deletion.
- Do not add a direct command for the add-project page.
- Use `/projects` as the TUI slash command for project list.
- Use `ctrl+o` from project list to open add-project page.
- Add-project search debounce is `10ms`.
- In add-project page, `enter` confirms the input value, not the highlighted selector item.
- In add-project page, `space` copies the highlighted selector item into the input and loads that directory's direct children.
- Directory browsing must not call `InstanceStore.load` or `Project.fromDirectory`.
- After changing public Server `HttpApi`, run `bun run generate` from `packages/client` and do not edit generated files directly.
- Run tests from package directories, never from repository root.
- Run `bun typecheck` from affected package directories, never `tsc` directly.
- Do not commit unless the user explicitly requests it.

---

## Task List

| # | Task Title | Task File | Task Status | Blocked By |
|---|------------|-----------|-------------|------------|
| 1 | directory-api | `task-01-directory-api.md` | `done` | `none` |
| 2 | active-dir | `task-02-active-dir.md` | `done` | `none` |
| 3 | project-list | `task-03-project-list.md` | `done` | `2` |
| 4 | add-project | `task-04-add-project.md` | `done` | `1,2,3` |
| 5 | verification | `task-05-verification.md` | `done` | `1,2,3,4` |

## Reference Files

- Spec: `docs/superpowers/specs/2026-07-08-tui-project-management-design.md`
- Issue: `docs/isusses/tui-project-management.md`
- HTTP API registry: `packages/opencode/src/server/routes/instance/httpapi/api.ts`
- HTTP API routes: `packages/opencode/src/server/routes/instance/httpapi/server.ts`
- Existing file API: `packages/opencode/src/server/routes/instance/httpapi/groups/file.ts`
- Existing file handler: `packages/opencode/src/server/routes/instance/httpapi/handlers/file.ts`
- Existing project API: `packages/opencode/src/server/routes/instance/httpapi/groups/project.ts`
- Existing project handler: `packages/opencode/src/server/routes/instance/httpapi/handlers/project.ts`
- Project service side effect: `packages/opencode/src/project/project.ts`
- Instance middleware side effect: `packages/opencode/src/server/routes/instance/httpapi/middleware/instance-context.ts`
- TUI app command registration: `packages/tui/src/app.tsx`
- TUI SDK context: `packages/tui/src/context/sdk.tsx`
- TUI project context: `packages/tui/src/context/project.tsx`
- TUI sync context: `packages/tui/src/context/sync.tsx`
- TUI keybind definitions: `packages/tui/src/config/keybind.ts`
- DialogSelect: `packages/tui/src/ui/dialog-select.tsx`
- Web app directory picker reference: `packages/app/src/components/directory-picker-domain.ts`
- Web app project selector reference: `packages/app/src/components/prompt-project-selector.tsx`
- Web app project controls reference: `packages/app/src/pages/session/composer/session-composer-controls.ts`
- Server HTTP API test example: `packages/opencode/test/server/httpapi-file.test.ts`
- TUI SDK fixture: `packages/tui/test/fixture/tui-sdk.ts`
- TUI environment fixture: `packages/tui/test/fixture/tui-environment.tsx`

## Execution Notes

- Task 1 changes public HttpApi and must run client generation.
- Task 2 can run independently from Task 1 because it only introduces active-directory switching infrastructure.
- Task 3 depends on Task 2 because project selection must call the soft switch helper.
- Task 4 depends on Task 1 for the generated directory browse SDK and on Task 3 for the project list entry point.
- Task 5 is final verification only and must not change feature behavior unless a prior task missed a requirement.
