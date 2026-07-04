# Large File Reads Abort Session Around 260k Input Tokens

**Status:** 未开始

## Summary

When a session reads a large number of files and the input token count reaches roughly 260k, the session can automatically enter an `aborted` state.

## Observed Behavior

1. The session performs large-scale file reads.
2. The accumulated input reaches approximately 260k tokens.
3. The session is automatically aborted.

## Expected

The session should either continue normally within supported limits or fail with a clear, actionable reason.

## Actual

The session is aborted automatically. The reason is currently unknown.

## Investigation

Not started. This issue is only recorded for follow-up investigation.
