# `/diff` Should Support Selecting The Git Diff Source

## Summary

The `/diff` flow should be整理ed so users can choose which Git diff source to review. Instead of assuming one implicit diff range, the command should support selecting the source of changed files, such as working tree changes, staged changes, or a branch/base comparison.

## Reproduction

1. Open a repository with more than one meaningful Git diff source, for example unstaged changes, staged changes, and commits ahead of the base branch.
2. Invoke `/diff`.
3. Observe which changed files are included and whether the user can choose the source.

## Expected

`/diff` should make the diff source explicit before collecting changed files. Users should be able to select the intended Git diff source, and the resulting file list should match that selection.

Examples of useful sources:

1. Working tree diff, including unstaged changes.
2. Staged diff.
3. Diff against the current branch upstream or another configured base.
4. Diff between two explicit refs when the command provides enough context.

## Actual

To verify. The current `/diff` behavior should be audited to determine which Git diff command or source it uses by default and whether it can incorrectly include, exclude, or mix changes when multiple diff sources exist.

## Impact

When `/diff` implicitly chooses a diff source, users can review the wrong set of files. This is risky before code review, commit preparation, or release checks because staged changes, unstaged work, and branch comparison changes often have different intent and review scope.

## Proposed Fix

1. Locate the `/diff` command implementation and identify the current changed-file collection logic.
2. Separate diff source selection from changed-file rendering and review logic.
3. Add an explicit source selection step when multiple Git diff sources are available.
4. Use the selected source to run the matching Git diff command and build the changed-file list.
5. Keep the existing default behavior only when there is a single unambiguous source.
6. Clearly label the selected source in the `/diff` UI or generated review context.

## Suggested Tests

1. Add a test where only unstaged changes exist and `/diff` uses the working tree source.
2. Add a test where only staged changes exist and `/diff` uses the staged source.
3. Add a test where both staged and unstaged changes exist and the selected source determines the file list.
4. Add a test for branch/base diff selection if the implementation supports upstream or explicit ref comparisons.
5. Assert that the rendered or generated diff context identifies the selected source.
