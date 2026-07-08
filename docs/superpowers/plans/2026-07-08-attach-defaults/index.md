# Attach Defaults Implementation Plan

> **For agentic workers:** REQUIRED INTERNAL MODULE: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `opencode attach` connect to the default local server and current directory when the user omits `url` and `--dir`.

**Architecture:** Keep attach mode explicit: only `opencode attach` changes. Add a small exported resolver in `attach.ts` that computes the effective URL and directory, then feed that target into the existing full TUI and mini attach paths. Cover resolver behavior with focused tests and update the CLI help snapshot for the optional positional URL.

**Tech Stack:** TypeScript, Bun test, yargs command definitions, existing opencode TUI attach command, CLI help snapshots.

## Global Constraints

- Default attach URL is exactly `http://127.0.0.1:4096`.
- `opencode attach` with no `--dir` uses the command's current working directory.
- Do not change default `opencode` TUI startup, worker behavior, `opencode run --attach`, or `opencode serve` defaults.
- Preserve explicit URL and explicit `--dir` behavior, including remote directory pass-through when local `chdir` fails.
- Preserve existing auth, session, fork, mini, validation, and TUI startup behavior.
- Run tests from `packages/opencode`, never from the repository root.
- Do not commit unless the user explicitly requests a commit.

---

## Task List

| # | Task Title | Task File | Task Status | Blocked By |
|---|------------|-----------|-------------|------------|
| 1 | attach-defaults | `task-01-attach-defaults.md` | `done` | `none` |

## Reference Files

- Spec: `docs/superpowers/specs/2026-07-08-attach-defaults-design.md`
- Source issue: `docs/isusses/tui-auto-attach-serve.md`
- Existing attach command: `packages/opencode/src/cli/cmd/attach.ts`
- Existing run mini bridge: `packages/opencode/src/cli/cmd/run.ts`
- Existing TUI command: `packages/opencode/src/cli/cmd/tui.ts`
- Existing server defaults: `packages/opencode/src/cli/network.ts`, `packages/opencode/src/server/server.ts`
- Attach tests: `packages/opencode/test/cli/tui/attach.test.ts`
- Help snapshot test: `packages/opencode/test/cli/help/help-snapshots.test.ts`
- Help snapshot: `packages/opencode/test/cli/help/__snapshots__/help-snapshots.test.ts.snap`
