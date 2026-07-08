# Task 5 Verification Report

## Status

status: implemented
commit: none (not requested)

## Commands Run

- `packages/client`: `bun run generate`
  - Result: PASS, exit 0.
  - Output: `$ bun run script/build.ts`
  - Notes: generated files are current after regeneration. `git diff --name-only` shows generated v2 SDK diffs under `packages/sdk/js/src/v2/gen/`.
- `packages/opencode`: `bun test test/server/httpapi-directory.test.ts`
  - Result: PASS, exit 0.
  - Output: `2 pass`, `0 fail`, `7 expect() calls`, `Ran 2 tests across 1 file. [11.60s]`
- `packages/opencode`: `bun typecheck`
  - Result: PASS, exit 0.
  - Output: `$ tsgo --noEmit`
- `packages/client`: `bun typecheck`
  - Result: PASS, exit 0.
  - Output: `$ tsgo --noEmit`
- `packages/tui`: `bun test test/context/project-switch.test.tsx test/component/dialog-project-list.test.ts test/component/dialog-project-add.test.ts`
  - Result: PASS, exit 0.
  - Output: `9 pass`, `0 fail`, `21 expect() calls`, `Ran 9 tests across 3 files. [1.59s]`
- `packages/tui`: `bun typecheck`
  - Result: PASS, exit 0.
  - Output: `$ tsgo --noEmit`

## Fixes Made

- No source or behavior fixes were required by verification.
- Updated Task 5's row in `docs/superpowers/plans/2026-07-08-tui-project-management/index.md` from `pending` to `done`, per the task brief's status-source instruction.

## Spec Coverage Checklist

- `/projects` opens project list: implemented by `project.list` command with `slashName: "projects"` in `packages/tui/src/app.tsx`.
- project list uses backend `/project`: implemented by `sdk.client.project.list()` in `DialogProjectList`; generated SDK maps this to `/project`.
- project list searches display name and directory: implemented by `projectSearchText()` and covered by `dialog-project-list.test.ts`.
- project list shows display name and directory: implemented by `createProjectListOptions()` title/details and covered by `dialog-project-list.test.ts`.
- project list has no deletion action: implemented; `DialogProjectList` only exposes the open-project action and no delete action.
- `ctrl+o` opens add-project from project list: implemented via `dialog.project.open` action and default keybind in `packages/tui/src/config/keybind.ts`.
- add-project has no direct command: implemented; `DialogProjectAdd` is only created from the project list command flow in `app.tsx`.
- `esc` from add-project returns project list: implemented by `DialogProjectAdd` calling `props.onBack()` on escape.
- add-project starts at current project parent directory: implemented by `projectParentDirectory()` and covered by `dialog-project-add.test.ts`.
- selector lists direct child directories: implemented by server `directory.list` returning only entries with `entry.type === "directory"`; covered by `httpapi-directory.test.ts`.
- search debounce is `10ms`: implemented by `setTimeout(..., 10)` in `DialogProjectAdd`.
- space copies selected directory into input and loads children: implemented by `chooseSelected()` calling `load(item.absolute)` on space.
- enter confirms input value: implemented by `confirm()` calling `switchProject(normalizeProjectInput(input()))`; it does not read the selected item.
- confirmed project soft re-enters target home: implemented by `useProjectSwitch()` setting SDK directory, clearing workspace, navigating home, clearing dialog, and bootstrapping; covered by `project-switch.test.tsx`.
- directory browse API does not call `InstanceStore.load` or `Project.fromDirectory`: implemented by the standalone `directory` HttpApi group using `Authorization` middleware only and handler using `FSUtil`; covered by `httpapi-directory.test.ts` verifying browsed directories are not added to `/project`.
- Windows paths are preserved through TUI input and validated by server-side path resolution: implemented by Windows separator normalization in TUI input helpers and `fs.resolve(ctx.query.path)` in the server handler; covered by `dialog-project-add.test.ts` Windows path cases and server directory API tests.

Result: every checklist line is implemented by code or covered by a focused test.

## Files Changed

- `.superpowers/sdd/task-5-report.md`
- `docs/superpowers/plans/2026-07-08-tui-project-management/index.md`
- Existing Task 1-4 working-tree changes remain present, including directory HttpApi files/tests, TUI project switch/list/add files/tests, and generated SDK files.

## Concerns

- Task status rows in `index.md` were synchronized after verification: Tasks 1-5 now show `done`.
- `git diff --name-only` reports content diffs for `packages/sdk/js/src/v2/gen/sdk.gen.ts` and `packages/sdk/js/src/v2/gen/types.gen.ts`; `git status --short` also lists many generated SDK files with line-ending warnings but no content diff from `git diff --name-only`.
