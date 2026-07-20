# Local Versions Should Skip Auto Update

**Status:** Resolved

## Summary

When the running version ends with `.local`, it represents a locally built or locally modified installation. Even if automatic updates are enabled, opencode should not perform a managed auto-update.

## Reproduction

1. Run opencode with a version string ending in `.local`.
2. Enable automatic updates.
3. Trigger or wait for an update check when a newer upstream version is available.
4. Observe the update behavior.

## Expected

opencode should skip the automatic update and only notify the user that this is a local build. The message should instruct the user to merge or pull the latest code and perform the local upgrade manually.

## Actual

To verify. The update flow should be audited to ensure `.local` versions cannot enter the managed automatic update path when auto-update is enabled.

## Impact

Automatically updating a `.local` build can overwrite or bypass local source changes, and it may leave the user with a binary that no longer matches their checked-out code. Users running local builds need an explicit local-upgrade workflow instead of managed replacement.

## Proposed Fix

1. Detect version strings ending with `.local` before starting a managed auto-update.
2. If detected, suppress automatic download and install behavior.
3. Show a user-facing notice explaining that local builds must be upgraded by merging or pulling the latest code and rebuilding locally.
4. Keep normal update checks and managed updates unchanged for non-`.local` versions.

## Suggested Tests

1. Add an updater test where the current version ends with `.local` and auto-update is enabled.
2. Assert that the managed update path is not invoked.
3. Assert that the local-upgrade notice is produced.
4. Add a control case showing non-`.local` versions still auto-update when enabled.
