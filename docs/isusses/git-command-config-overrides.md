# Git Commands Should Respect Repository Configuration

**Status:** 已解决

## Summary

opencode Git command wrappers should not force configuration values that change repository semantics. Git operations should respect the target repository and user Git configuration unless a command has a narrow, documented reason to override a setting.

## Observed Behavior

1. The Git wrapper forced `core.symlinks=true`, overriding repositories configured with `core.symlinks=false`.
2. On Windows, repositories with symlink entries checked out as regular files could show false typechange entries in opencode diff/status flows.
3. The Git wrapper also forced `core.autocrlf=false`, overriding user or repository line-ending behavior.
4. Workspace copy-back flows such as `/warp -> None` with copy changes could fail with `patch does not apply` even when the same patch applied successfully under the repository's normal Git configuration.

## Expected

Git status, diff, patch, apply, snapshot, and workspace copy operations should use the repository's effective Git configuration for semantic settings such as symlink handling and line endings.

Low-risk operational settings, such as disabling fsmonitor for consistency or enabling long paths on Windows, may still be applied when they do not change repository content interpretation.

## Actual

Some Git command paths hardcoded semantic configuration overrides. This made opencode observe or apply changes differently from ordinary Git commands run in the same repository.

## Impact

1. `/diff` and file-change prompts could include false symlink typechange entries.
2. `/warp -> None` with copy changes could be blocked even when the home worktree was clean.
3. Snapshot and GitV2 temporary repository paths could reproduce the same class of line-ending or symlink mismatch.
4. Users could see behavior that contradicted `git status`, `git diff`, or `git apply` in their terminal.

## Resolution

Removed hardcoded `core.autocrlf=false` and `core.symlinks=true` from the runtime Git command paths.

Changed files:

1. `packages/opencode/src/git/index.ts`
2. `packages/opencode/src/snapshot/index.ts`
3. `packages/core/src/git.ts`

## Verification

1. Runtime source search confirms no remaining `core.autocrlf` or `core.symlinks` overrides in `packages/opencode/src` or `packages/core/src`.
2. Focused typechecks passed in `packages/opencode` and `packages/core`.
3. Focused Git tests passed in `packages/opencode` and `packages/core`.
4. The previous `/warp` patch scenario passes `git apply --check` when using the updated wrapper configuration.
