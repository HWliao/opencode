# Local Build Update Skip Design

## Status

Approved direction, revision pending: protect all update entry points, but only refuse local managed upgrades after the update flow has established that an upgrade is actually needed.

Source issue: `docs/isusses/local-version-skips-auto-update.md`.

## Problem

When the running opencode version uses the local build format `x.y.z.local` or `x.y.z.local.<suffix>`, the binary represents a local build or a locally modified checkout. Managed update paths must not download, install, or replace that build when a newer managed release exists, because doing so can bypass local source changes and leave the binary out of sync with the checked-out code.

Local builds still need to perform the normal latest-version lookup first. If the normalized base version is already current, `opencode upgrade` should report that no upgrade is needed instead of warning that local upgrades are disabled. The local-build warning is only actionable when there is a newer target that the managed updater would otherwise install.

The current update flow has multiple entry points. TUI startup calls the automatic update check through `packages/opencode/src/cli/tui/worker.ts`, the TUI update prompt calls `/global/upgrade`, and the manual `opencode upgrade` command calls `Installation.upgrade` directly. A TUI-only guard would still allow other paths to perform a managed upgrade.

## Goals

- Detect local builds from the running version string format `x.y.z.local` or `x.y.z.local.<suffix>`.
- Keep the existing channel-based local detection intact.
- Normalize local build versions to their release base version, for example `1.2.3.local` and `1.2.3.local.4` both become `1.2.3`, before comparing with latest or target versions.
- Prevent managed update checks from producing normal update prompts for local builds only when latest is newer than the normalized base version.
- Prevent manual managed upgrades from replacing local builds through CLI or HTTP API paths only after resolving the requested target and confirming that target differs from the normalized base version.
- Show a clear user-facing message that local builds must be updated by pulling or merging latest code and rebuilding locally.
- Preserve existing behavior for non-local versions.

## Non-Goals

- Do not add a new local build updater.
- Do not change package manager detection for normal installations.
- Do not alter release type handling for non-local versions, except that callers must pass normalized local base versions into existing semver comparison helpers.
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

The shared version constants live in `packages/core/src/installation/version.ts`. It exposes `InstallationVersion`, `InstallationChannel`, and `InstallationLocal`. The current implementation already has a local predicate, but it must compare local versions by stripping `.local` and anything after it before comparing against latest or target versions.

## Design

Use shared local-version helpers and apply the managed-upgrade refusal at all managed update boundaries after target resolution.

The shared helpers should live near the existing installation version constants so every update caller uses the same definition:

- `isInstallationLocal(...)` returns true when the channel is `local`, the version is exactly `local`, or the version matches `x.y.z.local` with any optional suffix after `.local`.
- `normalizeInstallationVersion(...)` returns the comparable release version. For `1.2.3.local` and `1.2.3.local.4`, it returns `1.2.3`. For normal release versions, it returns the input without a leading `v`. For the exact version `local`, there is no comparable base version.

The local comparison rule is to strip `.local` and everything after it from semver-shaped local versions before comparing.

Automatic update checks should still read the installation method and fetch the latest version. They should compare the normalized current version with the latest version before deciding what to emit. If the normalized current version equals latest, the check should return without a notice. If latest is newer and the current build is local, the check should emit or surface a local-build notice that tells the user to update by pulling or merging latest source and rebuilding locally, and it must not emit `installation.update-available` or invoke managed install behavior.

Manual managed upgrades should resolve the effective target first, then compare that target with the normalized current version. This applies to both `opencode upgrade` and `/global/upgrade`, including the TUI prompt's follow-up API call. If there is no newer target, the command can report that the installed base version is already current. If the target differs and the current build is local, the command/API should refuse before calling `Installation.upgrade` and show the local-upgrade instruction.

`Installation.upgrade` should remain focused on executing a requested package-manager upgrade. The entry points should guard before calling it so user-facing messages can be tailored for CLI, TUI, and API contexts. If implementation finds an unguarded internal caller, add the same guard there rather than relying only on UI behavior.

## User-Facing Behavior

For local builds whose normalized base version is older than latest, automatic TUI checks should not show the normal "Update Available" dialog. The user should see a notice equivalent to:

`This is a local build of opencode. Managed auto-update is disabled. Pull or merge the latest code and rebuild locally to upgrade.`

Manual `opencode upgrade` should first check the effective target. If no newer version is available, it should print the existing already-installed style message using the normalized base version. If a newer target exists and the current build is local, it should print the local-upgrade message and exit without running package-manager commands.

`/global/upgrade` should return a structured failure or skipped result with the same meaning, so TUI can show a clear toast instead of a generic update failure.

## Error Handling

Local-build detection is not an error in automatic checks. It is an expected skip condition only after latest-version lookup shows a newer managed release.

For manual upgrade attempts, local-build detection should be reported explicitly as a refused managed upgrade only after the requested target is known to differ from the normalized current version. It should not be swallowed like transient latest-version lookup failures, because the user initiated the action.

Existing error handling for package-manager failures, unknown install methods, and update fetch failures remains unchanged for non-local versions.

## Testing

Add focused tests around the shared guard and entry-point behavior:

- A shared predicate test for `local`, `1.2.3.local`, `1.2.3.local.4`, and channel `local`.
- A shared normalization test showing `v1.2.3` becomes `1.2.3`, `1.2.3.local` and `1.2.3.local.4` become `1.2.3`, and `local` has no comparable base version.
- A TUI/automatic check test showing `1.2.3.local.4` calls `Installation.latest`, compares against `1.2.4`, does not emit `installation.update-available`, does not install, and surfaces the local-build notice.
- A TUI/automatic check test showing `1.2.3.local` or `1.2.3.local.4` with latest `1.2.3` produces no local-build notice and no install.
- A manual CLI upgrade test showing `1.2.3.local.4` resolves latest first, skips normally when latest is `1.2.3`, and refuses with the local-upgrade instruction when latest is `1.2.4`.
- A `/global/upgrade` handler test showing `1.2.3.local.4` resolves the target first, returns a clear skipped or failed result for a newer target, and does not call `installation.upgrade`.
- A non-local control case showing existing auto-update and manual upgrade behavior still works.

Run tests from package directories, not from the repo root.

## Acceptance Criteria

- A running version matching `x.y.z.local` or `x.y.z.local.<suffix>` cannot enter managed download or install paths from TUI, CLI, or HTTP API update entry points when the effective target differs from normalized base version `x.y.z`.
- A running version `1.2.3.local` or `1.2.3.local.4` is compared as `1.2.3` for latest/target checks and release-type parsing.
- TUI users do not receive a normal update prompt for local builds when a newer release exists; they receive the local-build notice instead.
- TUI users receive no local-build notice when the normalized base version is already current.
- Manual upgrade attempts on local builds produce an actionable local-upgrade message only when a newer/different target exists.
- Existing update behavior for non-local versions is unchanged.
- Tests cover both local and non-local behavior.
