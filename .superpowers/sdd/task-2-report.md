# Task 2 Report: active-dir

## What Was Implemented

- Added dynamic TUI SDK directory state via `useSDK().directory` getter and `useSDK().setDirectory(directory)`.
- Recreated the generated SDK client when the active directory changes.
- Updated project context fallback path construction to read the current SDK directory dynamically.
- Added `useProjectSwitch()` for soft project switching: set SDK directory, clear workspace, navigate home, clear dialogs, and run non-fatal bootstrap.
- Added a focused test covering soft project switching and generated SDK query routing.
- Updated TUI SDK fixture defaults so `/path` and `/project/current` account for the generated `directory` query parameter.

## TDD Evidence

### RED

Command, from `packages/tui`:

```bash
bun test test/context/project-switch.test.tsx
```

Output summary:

```text
error: Cannot find module '../../src/context/project-switch' from '.../packages/tui/test/context/project-switch.test.tsx'
0 pass
1 fail
1 error
Ran 1 test across 1 file. [1001.00ms]
```

This matched the expected missing production hook/module before implementation.

### GREEN

Command, from `packages/tui`:

```bash
bun test test/context/project-switch.test.tsx
```

Output summary:

```text
1 pass
0 fail
3 expect() calls
Ran 1 test across 1 file. [1480.00ms]
```

## Validation

Command, from `packages/tui`:

```bash
bun typecheck
```

Output summary:

```text
$ tsgo --noEmit
```

Exit status: success.

## Files Changed

- `packages/tui/src/context/sdk.tsx`
- `packages/tui/src/context/project.tsx`
- `packages/tui/src/context/project-switch.tsx`
- `packages/tui/test/context/project-switch.test.tsx`
- `packages/tui/test/fixture/tui-sdk.ts`
- `.superpowers/sdd/task-2-report.md`

## Self-Review Findings

- The implementation keeps the switch behavior local to TUI context state and does not change default `opencode` TUI launch, `opencode run --attach`, or `opencode serve` behavior.
- `setDirectory` is idempotent when called with the current directory.
- The new SDK getter keeps callers reading the latest client after a directory switch.
- The project fallback path now reflects the current SDK directory rather than the startup directory.
- The focused test uses the repository's current `testRender` cleanup API, `app.renderer.destroy()`, and supplies required providers for `DialogProvider` infrastructure.

## Concerns

- None.

## Commits

- none (not requested)
