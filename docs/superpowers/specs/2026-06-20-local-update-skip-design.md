# Local Build Update Skip Design

## Status

Approved direction: protect all update entry points, with TUI as the priority path.

Source issue: `docs/isusses/local-version-skips-auto-update.md`.

## Problem

When the running opencode version ends with `.local`, the binary represents a local build or a locally modified checkout. Managed update paths must not download, install, or replace that build, because doing so can bypass local source changes and leave the binary out of sync with the checked-out code.

The current update flow has multiple entry points. TUI startup calls the automatic update check through `packages/opencode/src/cli/tui/worker.ts`, the TUI update prompt calls `/global/upgrade`, and the manual `opencode upgrade` command calls `Installation.upgrade` directly. A TUI-only guard would still allow other paths to perform a managed upgrade.

## Goals

- Detect local builds from the running version string ending with `.local`.
- Keep the existing channel-based local detection intact.
- Prevent managed update checks from producing normal update prompts for local builds.
- Prevent manual managed upgrades from replacing local builds through CLI or HTTP API paths.
- Show a clear user-facing message that local builds must be updated by pulling or merging latest code and rebuilding locally.
- Preserve existing behavior for non-local versions.

## Non-Goals

- Do not add a new local build updater.
- Do not change package manager detection for normal installations.
- Do not alter release type handling for non-local versions.
- Do not redesign the desktop Electron updater flow beyond using the same local-build rule if it shares the version constants.

## Existing Flow

The TUI path is split into two phases:

1. `packages/opencode/src/cli/tui/worker.ts` calls `upgrade()` during the update check.
2. `packages/opencode/src/cli/upgrade.ts` checks config, detects the install method, reads the latest version, emits `installation.update-available`, or performs patch auto-upgrade.
3. `packages/tui/src/app.tsx` listens for `installation.update-available` and prompts the user.
4. If the user accepts, TUI calls `sdk.client.global.upgrade({ target: version })`.
5. `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts` calls `installation.upgrade(method, target)`.

The manual CLI path is separate:

1. `packages/opencode/src/cli/cmd/upgrade.ts` resolves the method and target.
2. It calls `Installation.upgrade(method, target)` directly.

The shared version constants live in `packages/core/src/installation/version.ts`. It currently exposes `InstallationVersion`, `InstallationChannel`, and `InstallationLocal`, where `InstallationLocal` only checks the channel.

## Design

Use one shared local-build predicate and apply it at all managed update boundaries.

The shared predicate should live near the existing installation version constants so every update caller uses the same definition. The predicate should return true when the current version is exactly `local`, ends with `.local`, or the channel is `local`. This preserves the existing channel behavior and adds the requested version suffix behavior.

Automatic update checks should short-circuit before fetching the latest version or invoking any managed install behavior. For the TUI path, this prevents `installation.update-available` from being emitted for local builds. Instead, the check should emit or surface a local-build notice that tells the user to update by pulling or merging latest source and rebuilding locally.

Manual managed upgrades should also refuse local builds before calling `Installation.upgrade`. This applies to both `opencode upgrade` and `/global/upgrade`, including the TUI prompt's follow-up API call. The response should be a normal, explicit skip/failure message rather than a silent no-op, because manual actions need feedback.

`Installation.upgrade` should remain focused on executing a requested package-manager upgrade. The entry points should guard before calling it so user-facing messages can be tailored for CLI, TUI, and API contexts. If implementation finds an unguarded internal caller, add the same guard there rather than relying only on UI behavior.

## User-Facing Behavior

For local builds, automatic TUI checks should not show the normal "Update Available" dialog. The user should see a notice equivalent to:

`This is a local build of opencode. Managed auto-update is disabled. Pull or merge the latest code and rebuild locally to upgrade.`

Manual `opencode upgrade` should print a similar message and exit without running package-manager commands.

`/global/upgrade` should return a structured failure or skipped result with the same meaning, so TUI can show a clear toast instead of a generic update failure.

## Error Handling

Local-build detection is not an error in automatic checks. It is an expected skip condition.

For manual upgrade attempts, local-build detection should be reported explicitly as a refused managed upgrade. It should not be swallowed like transient latest-version lookup failures, because the user initiated the action.

Existing error handling for package-manager failures, unknown install methods, and update fetch failures remains unchanged for non-local versions.

## Testing

Add focused tests around the shared guard and entry-point behavior:

- A shared predicate test for `local`, `1.2.3.local`, and channel `local`.
- A TUI/automatic check test showing `.local` does not call `Installation.latest`, does not emit `installation.update-available`, and surfaces the local-build notice.
- A manual CLI upgrade test showing `.local` exits before calling `Installation.upgrade` and prints the local-upgrade instruction.
- A `/global/upgrade` handler test showing `.local` returns a clear skipped or failed result without calling `installation.upgrade`.
- A non-local control case showing existing auto-update and manual upgrade behavior still works.

Run tests from package directories, not from the repo root.

## Acceptance Criteria

- A running version ending in `.local` cannot enter managed download or install paths from TUI, CLI, or HTTP API update entry points.
- TUI users do not receive a normal update prompt for local builds.
- Manual upgrade attempts on local builds produce an actionable local-upgrade message.
- Existing update behavior for non-local versions is unchanged.
- Tests cover both local and non-local behavior.
