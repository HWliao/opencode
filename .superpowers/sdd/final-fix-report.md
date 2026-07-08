# Final Fix Report

## Status

DONE_WITH_CONCERNS

## Fixes Made Per Finding

- Critical 1: Fixed `filterProjectDirectories` in `packages/tui/src/component/dialog-project-add.tsx` to accept the current browse root and treat an input equal to that root as an empty query, so initial load and `space` reload show all direct children.
- Critical 2: Updated add-project input handling so `onInput` keeps the value as a full path and normalizes the accidental `root + suffix` shape into `root/suffix`. Filtering now derives the query relative to the current browse root.
- Important 3: Updated `packages/tui/src/context/project-switch.tsx` to refresh DataProvider location-scoped default data after a soft project switch, including references, agents, integrations, models, providers, commands, and skills.
- Important 4: Updated `packages/opencode/src/server/routes/instance/httpapi/handlers/directory.ts` to reject non-absolute input paths and map path validation/resolve failures into the declared `400` bad request contract.
- Important 5: Fixed `projectParentDirectory`/`normalizeProjectInput` root handling so `/home` returns `/` and `D:/repo` returns `D:/`.
- Minor 6: Added focused regression tests for the critical helper failures, root/drive parent behavior, DataProvider refresh on soft switch, and directory API relative-path rejection.
- Minor 7: Not changed. `DialogSelect` action execution currently requires a selected option before invoking any action callback; making `dialog.project.open` selection-optional would require widening shared action callback typing/behavior across dialogs. I left this out as not small/safe for final fixes.

## TDD RED Evidence

- `packages/tui`: `bun test test/component/dialog-project-add.test.ts`
- Result before fix: `5 pass / 2 fail`; failures were `shows direct children when the input equals the browse root` returning `[]`, and `keeps root and drive parents stable` returning `""` for `/home`.
- `packages/tui`: `bun test test/context/project-switch.test.tsx`
- Result before fix: `0 pass / 1 fail`; target `/api/reference?directory=...` refresh was not observed after soft switch.
- `packages/opencode`: `bun test test/server/httpapi-directory.test.ts`
- Result before fix: `2 pass / 1 fail`; `rejects relative paths` expected `400` but received `200`.

## GREEN Evidence

- `packages/tui`: `bun test test/component/dialog-project-add.test.ts`
- Result after fix: `7 pass / 0 fail`, `11 expect() calls`.
- `packages/tui`: `bun test test/context/project-switch.test.tsx`
- Result after fix: `1 pass / 0 fail`, `6 expect() calls`.
- `packages/opencode`: `bun test test/server/httpapi-directory.test.ts`
- Result after fix: `3 pass / 0 fail`, `8 expect() calls`.
- `packages/tui`: `bun typecheck`
- Result: completed with no reported errors.
- `packages/opencode`: `bun typecheck`
- Result: completed with no reported errors.

## Commands Run

- From `packages/tui`: `bun test test/component/dialog-project-add.test.ts` -> RED: `5 pass / 2 fail`; GREEN: `7 pass / 0 fail`.
- From `packages/tui`: `bun test test/context/project-switch.test.tsx` -> RED: `0 pass / 1 fail`; GREEN: `1 pass / 0 fail`.
- From `packages/opencode`: `bun test test/server/httpapi-directory.test.ts` -> RED: `2 pass / 1 fail`; GREEN: `3 pass / 0 fail`.
- From `packages/tui`: `bun typecheck` -> no reported errors.
- From `packages/opencode`: `bun typecheck` -> no reported errors.
- From repo root: `git status --short` -> broad branch remains uncommitted with generated/client/TUI/backend files from this feature plus this report.
- From repo root: `git diff -- packages/tui/src/component/dialog-project-add.tsx packages/tui/test/component/dialog-project-add.test.ts packages/tui/src/context/project-switch.tsx packages/tui/test/context/project-switch.test.tsx packages/opencode/src/server/routes/instance/httpapi/handlers/directory.ts packages/opencode/test/server/httpapi-directory.test.ts` -> no output because these files are currently untracked in this worktree.

## Files Changed

- `packages/tui/src/component/dialog-project-add.tsx`
- `packages/tui/test/component/dialog-project-add.test.ts`
- `packages/tui/src/context/project-switch.tsx`
- `packages/tui/test/context/project-switch.test.tsx`
- `packages/opencode/src/server/routes/instance/httpapi/handlers/directory.ts`
- `packages/opencode/test/server/httpapi-directory.test.ts`
- `.superpowers/sdd/final-fix-report.md`

## Concerns

- `dialog.project.open` still requires a selected option because the shared `DialogSelect` action runner exits when no option is selected. Addressing that safely would require a separate small design/API adjustment for optional-selection actions.
- The branch worktree already contained many uncommitted generated and feature files before these final fixes; no unrelated files were reverted or modified intentionally.

## Final Re-Review Blocker Fix

### Status

DONE

### Fix Made

- Updated `packages/tui/src/context/project-switch.tsx` so `useProjectSwitch()` first validates the target with `sdk.client.directory.list({ path: directory })` and throws `validation.error` before any SDK directory mutation, workspace clear, home navigation, dialog clear, bootstrap, or DataProvider refresh.
- The shared validation applies to both add-project confirmation and project-list selection because both call `useProjectSwitch()`.

### TDD RED Evidence

- `packages/tui`: `bun test test/context/project-switch.test.tsx`
- Result before fix: `1 pass / 1 fail`; invalid switch test observed a target `/path?directory=...` request after `/directory` returned `400`, proving state mutation/bootstrap happened without validation.

### GREEN Evidence

- `packages/tui`: `bun test test/context/project-switch.test.tsx` -> `2 pass / 0 fail`, `13 expect() calls`.
- `packages/tui`: `bun test test/component/dialog-project-add.test.ts` -> `7 pass / 0 fail`, `11 expect() calls`.
- `packages/tui`: `bun test test/component/dialog-project-list.test.ts` -> `4 pass / 0 fail`, `11 expect() calls`.
- `packages/tui`: `bun typecheck` -> completed with no reported errors.

### Files Changed

- `packages/tui/src/context/project-switch.tsx`
- `packages/tui/test/context/project-switch.test.tsx`
- `.superpowers/sdd/final-fix-report.md`

### Concerns

- The worktree still contains pre-existing broad uncommitted/generated feature changes and these new TUI files remain untracked, so `git diff -- <files>` does not show the untracked file contents.

## Final Re-Review Important Fix: Add-Project Path Handling

### Status

DONE

### Fix Made

- Updated `joinProjectInput` in `packages/tui/src/component/dialog-project-add.tsx` so valid rooted absolute paths remain the source of truth.
- Preserved relative suffix input and Windows separator normalization.
- Kept the accidental `root + suffix` repair only for the safe interactive case where a single non-separator character is appended to a non-root, non-drive-root browse root.

### Regression Coverage

- Added focused tests proving `joinProjectInput("/", "/home")` returns `/home`.
- Added focused tests proving `joinProjectInput("D:/", "D:/repo")` returns `D:/repo`.
- Added focused tests proving `joinProjectInput("D:/develop/opencode", "D:/develop/opencode-next")` returns `D:/develop/opencode-next`.
- Added adjacent coverage for rooted child input and the preserved safe accidental `D:/develop/opencodeA` -> `D:/develop/opencode/A` repair.

### GREEN Evidence

- `packages/tui`: `bun test test/component/dialog-project-add.test.ts` -> `8 pass / 0 fail`, `16 expect() calls`.
- `packages/tui`: `bun typecheck` -> completed with no reported errors.

### Files Changed

- `packages/tui/src/component/dialog-project-add.tsx`
- `packages/tui/test/component/dialog-project-add.test.ts`
- `.superpowers/sdd/final-fix-report.md`

### Concerns

- None for this final Important finding.
