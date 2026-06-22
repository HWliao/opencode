# Local Update Skip Implementation Plan

> **For agentic workers:** Default execution route: `subagent-driven-development`. Use `executing-plans` only if the user explicitly prefers inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent managed update checks and upgrade commands from replacing `.local` opencode builds, while giving users a clear local-upgrade instruction.

**Architecture:** Add one shared local-build predicate in core installation version metadata, then apply it at each managed update boundary. Automatic checks emit an existing TUI toast event instead of an update prompt; manual CLI and HTTP upgrades return explicit local-build skip messages before resolving package-manager methods or running installers.

**Tech Stack:** Bun tests, TypeScript, Effect services, `GlobalBus`, existing `TuiEvent.ToastShow`, `@clack/prompts`, opencode HttpApi handlers.

---

## Task List

| # | Task Title | Task File | Task Status | Blocked By |
|---|------------|-----------|-------------|------------|
| 1 | local-predicate | `task-01-local-predicate.md` | `done` | `none` |
| 2 | auto-check | `task-02-auto-check.md` | `done` | `1` |
| 3 | cli-upgrade | `task-03-cli-upgrade.md` | `done` | `1` |
| 4 | http-upgrade | `task-04-http-upgrade.md` | `done` | `1` |
| 5 | verification | `task-05-verification.md` | `done` | `2, 3, 4` |

## Reference Files

- Spec: `docs/superpowers/specs/2026-06-20-local-update-skip-design.md`
- Source issue: `docs/isusses/local-version-skips-auto-update.md`
- Version constants: `packages/core/src/installation/version.ts`
- Installation service: `packages/opencode/src/installation/index.ts`
- Automatic update check: `packages/opencode/src/cli/upgrade.ts`
- TUI worker caller: `packages/opencode/src/cli/tui/worker.ts`
- CLI command: `packages/opencode/src/cli/cmd/upgrade.ts`
- HTTP handler: `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts`
- HTTP group schema: `packages/opencode/src/server/routes/instance/httpapi/groups/global.ts`
- TUI toast event: `packages/opencode/src/server/tui-event.ts`
- TUI update prompt: `packages/tui/src/app.tsx`
- Existing installation tests: `packages/opencode/test/installation/installation.test.ts`
- Existing global API tests: `packages/opencode/test/server/httpapi-global.test.ts`

## File Structure

- `packages/core/src/installation/version.ts` owns the canonical local-build predicate and user-facing local-upgrade message.
- `packages/core/test/installation-version.test.ts` covers the pure predicate and message text.
- `packages/opencode/src/installation/index.ts` keeps `Installation.isLocal()` as the opencode-side seam used by upgrade entry points and tests.
- `packages/opencode/src/cli/upgrade.ts` owns automatic update-check behavior and emits the existing TUI toast event for local builds.
- `packages/opencode/test/cli/upgrade-check.test.ts` covers automatic update local/non-local behavior through injected dependencies.
- `packages/opencode/src/cli/cmd/upgrade.ts` owns manual `opencode upgrade` behavior.
- `packages/opencode/test/cli/upgrade-command.test.ts` covers manual local skip and non-local control behavior.
- `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts` owns `/global/upgrade` behavior.
- `packages/opencode/test/server/httpapi-global.test.ts` extends existing API coverage for local-build refusal.
- `packages/tui/src/app.tsx` displays structured API upgrade errors when the TUI update prompt path receives one.
