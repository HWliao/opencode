# Local Version Upgrade Implementation Plan

> **For agentic workers:** Default execution route: `subagent-driven-development`. Use `executing-plans` only if the user explicitly prefers inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local versions in `x.y.z.local` and `x.y.z.local.<suffix>` format compare as their base release version, and refuse managed upgrades only after a newer target is known.

**Architecture:** Keep version parsing in `packages/core/src/installation/version.ts`, then reuse it from automatic update checks, the manual `opencode upgrade` command, and `/global/upgrade`. The entry points will resolve method/latest/target first, compare against the normalized current version, and only then block local builds before managed install execution.

**Tech Stack:** Bun tests, TypeScript, Effect services, semver, existing opencode CLI and HttpApi update paths.

---

## Task List

| # | Task Title | Task File | Task Status | Blocked By |
|---|------------|-----------|-------------|------------|
| 1 | version-helpers | `task-01-version-helpers.md` | `done` | `none` |
| 2 | upgrade-flows | `task-02-upgrade-flows.md` | `done` | `1` |
| 3 | spinner-runtime | `task-03-spinner-runtime.md` | `done` | `none` |
| 4 | verification | `task-04-verification.md` | `done` | `1, 2, 3` |

## Reference Files

- Spec: `docs/superpowers/specs/2026-06-20-local-update-skip-design.md`
- Existing plan history: `docs/superpowers/plans/2026-06-21-local-update-skip/index.md`
- Version constants: `packages/core/src/installation/version.ts`
- Version tests: `packages/core/test/installation-version.test.ts`
- Automatic update check: `packages/opencode/src/cli/upgrade.ts`
- Automatic update tests: `packages/opencode/test/cli/upgrade-check.test.ts`
- CLI upgrade command: `packages/opencode/src/cli/cmd/upgrade.ts`
- CLI upgrade tests: `packages/opencode/test/cli/upgrade-command.test.ts`
- HTTP upgrade handler: `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts`
- HTTP upgrade tests: `packages/opencode/test/server/httpapi-global.test.ts`
- Packaged TUI spinner usage: `packages/opencode/src/cli/cmd/run/footer.view.tsx`, `packages/opencode/src/cli/cmd/run/footer.subagent.tsx`, `packages/tui/src/component/spinner.tsx`

## File Structure

- `packages/core/src/installation/version.ts` owns local version detection, normalization, and message text.
- `packages/core/test/installation-version.test.ts` covers local detection and normalized comparable versions.
- `packages/opencode/src/cli/upgrade.ts` owns automatic check ordering and local notice emission.
- `packages/opencode/src/cli/cmd/upgrade.ts` owns manual target resolution and local refusal.
- `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts` owns API target resolution and local refusal.
- `packages/opencode/test/cli/upgrade-check.test.ts`, `packages/opencode/test/cli/upgrade-command.test.ts`, and `packages/opencode/test/server/httpapi-global.test.ts` cover the revised entry-point behavior.
- Spinner runtime files will be changed only if the direct-run `unknown component type: spinner` root cause is in local code rather than external packaging.
