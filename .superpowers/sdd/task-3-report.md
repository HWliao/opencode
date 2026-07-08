# Task 3 Report: Project List

## What I Implemented

- Added `packages/tui/src/component/dialog-project-list.tsx` with `DialogProjectList`, `projectDisplayName`, `projectSearchText`, and `createProjectListOptions`.
- Added `/projects` command wiring in `packages/tui/src/app.tsx` for `project.list`.
- Added keybind definitions for `project_list` and `dialog.project.open` in `packages/tui/src/config/keybind.ts`.
- Added `/project` fallback response in `packages/tui/test/fixture/tui-sdk.ts`.
- Added pure behavior tests in `packages/tui/test/component/dialog-project-list.test.ts`.

## Tests Run

- `bun test test/component/dialog-project-list.test.ts` from `packages/tui`
- `bun typecheck` from `packages/tui`

## TDD Evidence

### RED

Command:

```bash
bun test test/component/dialog-project-list.test.ts
```

Output summary:

```text
error: Cannot find module '../../src/component/dialog-project-list'
0 pass
1 fail
1 error
Ran 1 test across 1 file. [425.00ms]
```

This matched the expected failure from the task brief because the production module did not exist yet.

### GREEN

Command:

```bash
bun test test/component/dialog-project-list.test.ts
```

Output summary:

```text
3 pass
0 fail
9 expect() calls
Ran 3 tests across 1 file. [1.52s]
```

Package validation command:

```bash
bun typecheck
```

Output summary:

```text
$ tsgo --noEmit
```

Exit code was 0.

## Files Changed

- `packages/tui/src/component/dialog-project-list.tsx`
- `packages/tui/src/app.tsx`
- `packages/tui/src/config/keybind.ts`
- `packages/tui/test/fixture/tui-sdk.ts`
- `packages/tui/test/component/dialog-project-list.test.ts`
- `.superpowers/sdd/task-3-report.md`

## Self-Review Findings

- The implementation follows the task brief's file list, exported helper names, command names, slash command, and keybind names.
- The focused behavior test was written before production code and failed for the expected missing-module reason.
- The focused test and `packages/tui` typecheck both passed after implementation.
- No commits were created.

## Concerns

- The working tree contains unrelated pre-existing changes outside this task, including generated SDK/client files, server HTTP API files, Task 2 TUI files, and plan/spec artifacts. I did not revert or modify unrelated files.

## Review Fix: Directory Search

### What I Fixed

- Added an optional `search` field to `DialogSelectOption` and included it in `DialogSelect` fuzzy filtering.
- Moved project-list combined display-name/directory search text from `value.search` to `option.search`, which the shared `DialogSelect` filter now reads.
- Added focused coverage proving a project option can be found by directory text.

### Tests Run

- `bun test test/component/dialog-project-list.test.ts` from `packages/tui`: `4 pass`, `0 fail`, `11 expect() calls`
- `bun typecheck` from `packages/tui`: exit code 0

### Files Changed By This Fix

- `packages/tui/src/ui/dialog-select.tsx`
- `packages/tui/src/component/dialog-project-list.tsx`
- `packages/tui/test/component/dialog-project-list.test.ts`
- `.superpowers/sdd/task-3-report.md`

### Concerns

- No new concerns. Existing unrelated worktree changes remain untouched.
