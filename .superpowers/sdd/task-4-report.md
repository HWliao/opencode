# Task 4 Report: Add Project

## What Was Implemented

- Added `DialogProjectAdd` for opening a project by browsing local directories from the current project parent directory.
- Added exported pure helpers: `projectParentDirectory`, `joinProjectInput`, `filterProjectDirectories`, and `normalizeProjectInput`.
- Wired `project.list` so the project list opens the add-project dialog via the existing `dialog.project.open` action hook and `onOpenProject` callback.
- Added `/directory` support to the TUI SDK fixture for direct child directory responses.
- Added focused tests for the pure add-project helper behavior.

## TDD Evidence

### RED

Command run from `packages/tui`:

```bash
bun test test/component/dialog-project-add.test.ts
```

Output summary:

```text
error: Cannot find module '../../src/component/dialog-project-add'
0 pass
1 fail
1 error
Ran 1 test across 1 file. [475.00ms]
```

### GREEN

Command run from `packages/tui`:

```bash
bun test test/component/dialog-project-add.test.ts
```

Output summary:

```text
4 pass
0 fail
7 expect() calls
Ran 4 tests across 1 file. [1365.00ms]
```

## Tests Run

Command run from `packages/tui`:

```bash
bun test test/component/dialog-project-add.test.ts test/component/dialog-project-list.test.ts
```

Exact result:

```text
8 pass
0 fail
18 expect() calls
Ran 8 tests across 2 files. [1.52s]
```

Command run from `packages/tui`:

```bash
bun typecheck
```

Exact result:

```text
$ tsgo --noEmit
```

## Files Changed

- `packages/tui/src/component/dialog-project-add.tsx`
- `packages/tui/src/app.tsx`
- `packages/tui/test/fixture/tui-sdk.ts`
- `packages/tui/test/component/dialog-project-add.test.ts`
- `.superpowers/sdd/task-4-report.md`

## Self-Review Findings

- The implementation preserves Task 3 `DialogSelect` search support and does not modify `DialogSelect`.
- No direct add-project command was added; navigation is only through `dialog.project.open` from `DialogProjectList`.
- The task brief's JSX snippet used an outdated local `Dialog`/`input defaultValue` API for this workspace. I adapted that to the current TUI API by rendering dialog content inside the existing `DialogProvider` wrapper and initializing the `InputRenderable` through `ref`, while preserving the requested behavior.
- Existing unrelated and pre-existing worktree changes were left untouched.

## Concerns

- None.

## Commits

- none (not requested)
