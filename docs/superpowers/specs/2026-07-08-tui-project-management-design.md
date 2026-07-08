# TUI Project Management Design

## Context

`docs/isusses/tui-project-management.md` defines a new TUI product requirement: users should be able to open a new filesystem directory as a project and switch between existing projects from inside the TUI. This is separate from workspace/worktree management. `/move` and `/warp` stay scoped to the current project boundary and do not satisfy this requirement.

The web app already has project selection and project opening behavior. Its directory picker uses server-side SDK calls to list and search directories. The TUI design should use the web app as a reference only where the TUI-specific decisions below do not already define behavior.

## Goals

- Add a TUI project list reachable with `/projects`.
- Let users switch to an existing project without restarting the TUI.
- Let users open a new project directory from the project list.
- Keep project deletion out of scope.
- Support Windows absolute paths.
- Show each project with both a display name and directory.
- Preserve TUI keyboard-first interaction.
- Avoid registering browsed intermediate directories as opened projects.

## Non-Goals

- No project deletion flow.
- No Windows-style file explorer UI.
- No direct command for the add-project page.
- No automatic jump to the target project's latest session.
- No broad redesign of workspace/worktree management.

## Existing Code Facts

- TUI currently has `workspace.list` and `DialogWorkspaceList`, but that flow manages experimental workspaces and includes deletion. It is not the project management flow required here.
- TUI `SDKProvider` currently receives a startup `directory` and creates an SDK client with that default directory.
- TUI `ProjectProvider` and `SyncProvider` derive project, path, sessions, providers, agents, config, VCS, and related state from the SDK default directory plus the current workspace.
- Backend `Project.Service.list()` returns projects stored in `ProjectTable`; `/project` exposes this as the list of projects opened with OpenCode.
- Backend `Project.fromDirectory(directory)` upserts project state and records known directories.
- Existing `file.list` and `find.files` endpoints use `InstanceContextMiddleware`. That middleware calls `InstanceStore.load({ directory })`, which can call `Project.fromDirectory(directory)`. Therefore those endpoints must not be used for side-effect-free browsing of arbitrary parent directories in this feature.

## Architecture

Use a TUI soft re-enter model for project switching.

When the user selects an existing project or confirms a new project directory:

- Update the TUI active project directory.
- Recreate the SDK default directory or remount the project-scoped provider subtree with the target directory.
- Clear the current dialog.
- Navigate to the `home` route.
- Let normal project bootstrap load the target project context.

This intentionally behaves like starting the TUI in the target directory, except the process is not restarted. This is preferred over passing `directory` through every SDK call, because explicit per-call routing would be easy to miss and could leave stale project state mixed with the new project.

## Project List Page

Entry:

- Register a TUI command named `project.list`.
- Use slash name `projects`, so `/projects` opens the project list.
- The add-project page has no independent command entry and can only be opened from this page.

Data:

- Load existing projects from `sdk.client.project.list()`.
- Do not maintain a separate TUI project history.
- Do not expose project deletion.

Display:

- Display name priority:
  1. `project.name`, when available.
  2. Basename of `project.worktree`.
- Always show the project directory as secondary detail.
- Mark or highlight the current project.
- Search matches both display name and directory.

Keyboard behavior:

- Typing filters the project list.
- `up` / `down` moves the selected project.
- `enter` switches to the selected project and soft re-enters its home route.
- `ctrl+o` opens the add-project page.
- `esc` closes the dialog.

## Add Project Page

Entry and exit:

- The page is only reachable from project list via `ctrl+o`.
- `esc` returns to project list.
- It does not register a command or slash command.

Initial state:

- The input starts with the parent directory of the current project.
- The selector shows direct child directories under that input directory.
- Example: if the default input is `D:/develop/opencode`, the selector shows entries such as `D:/develop/opencode/subA` and `D:/develop/opencode/subB`.

Input and selector semantics:

- The input is the source of truth for the project directory that `enter` confirms.
- The selector offers fuzzy-matched direct child directories for the current input context.
- Search filtering uses a `10ms` debounce.
- Typing appends or edits the path in the input.
- Example flow:
  - Initial input: `D:/develop/opencode`.
  - Initial selector: `D:/develop/opencode/subA`, `D:/develop/opencode/subB`, and other direct children.
  - User types `A`.
  - Input becomes `D:/develop/opencode/A`.
  - Selector shows fuzzy matches such as `D:/develop/opencode/subA`.
  - User presses `space`.
  - Input becomes the selected directory, for example `D:/develop/opencode/subA`.
  - Selector reloads direct children of `D:/develop/opencode/subA`.
  - User presses `enter`.
  - The current input value is used as the project directory.

Keyboard behavior:

- Typing edits the input and filters the current selector layer.
- `up` / `down` moves the selected selector item.
- `space` replaces the input with the selected selector item and loads that directory's direct children.
- `enter` validates and confirms the input value as the project directory. It does not use the selected item unless `space` already copied that item into the input.
- `esc` returns to project list.

Path handling:

- Support Windows absolute path forms, including drive-letter paths such as `D:/repo` or `D:\repo`.
- Preserve the user's path intent in the TUI input, but normalize enough for comparison, search, and display.
- Server validation resolves the final input path from the server's filesystem perspective.
- The web app picker path helpers may be referenced for missing edge cases, but the confirmed TUI interaction model above has priority.

## Directory Browse API

Add a side-effect-free server-side directory browsing API for this feature.

Requirements:

- Accept a server-side absolute directory path.
- Return direct child directories with name and absolute path.
- Optionally accept a query string or let the TUI filter locally; local TUI filtering is preferred for the current direct-child list.
- Do not use `InstanceContextMiddleware`.
- Do not call `InstanceStore.load`.
- Do not call `Project.fromDirectory`.
- Do not create, update, or touch project rows.
- Do not recursively scan.
- Keep authorization consistent with the existing HTTP API surface.

Error behavior:

- If the path does not exist, is not a directory, or cannot be read, return a structured error suitable for a toast.
- The TUI remains on the add-project page after browse errors.
- A failed child-directory read does not change the current input.

This API exists because the current `file.list` and `find.files` endpoints are not side-effect-free for arbitrary directory browsing.

## Confirming A Project Directory

When `enter` is pressed in the add-project page:

- Use the current input value as the project directory.
- Validate that the path resolves to an existing directory on the server.
- Trigger the TUI soft re-enter flow for that directory.
- The normal project bootstrap may then call `Project.fromDirectory`, which is the correct moment to create or update the project record.
- Navigate to target project home.

## Error Handling

- Existing project switch failure: stay on project list and show an error toast.
- Directory browse failure: stay on add-project page and show an error toast.
- Confirmed input is not a valid directory: stay on add-project page and show an error toast.
- Soft re-enter bootstrap failure: surface the normal TUI bootstrap error behavior for the target directory.

## Testing Requirements

- `/projects` opens the project list.
- Project list loads from backend `/project`.
- Project list search matches display name and directory.
- Current project is marked or highlighted.
- Project list does not show deletion actions.
- `ctrl+o` opens the add-project page from project list.
- Add-project page cannot be opened directly by a command.
- `esc` from add-project page returns to project list.
- Add-project initial input is the current project parent directory.
- Add-project selector lists only direct child directories.
- Add-project input filtering uses `10ms` debounce.
- `up` / `down` move selected items in both pages.
- `space` in add-project page copies the selected directory into the input and loads its direct children.
- `enter` in add-project page confirms the input value, not the selected item.
- Confirming a directory soft re-enters the target project home.
- Directory browse API does not call `Project.fromDirectory` and does not add browsed directories to `/project`.
- Windows absolute paths are preserved through the TUI input and parsed by the server-side validation path.

## Implementation Boundaries

- Keep changes focused on TUI project management and the minimal backend API needed for side-effect-free directory browsing.
- Do not change workspace deletion, project copy deletion, `/move`, or `/warp` behavior.
- Do not edit generated SDK files directly. If the public Protocol or Server `HttpApi` changes, run the repository generation command from `packages/client` during implementation planning/execution.
- Do not commit unless explicitly requested.
