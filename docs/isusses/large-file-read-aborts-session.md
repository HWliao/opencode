# Large File Reads Abort Session Around 260k Input Tokens

**Status:** 已解决

## Summary

When a session reads a large number of files and the input token count reaches roughly 260k, the session can automatically enter an `aborted` state.

## Observed Behavior

1. The session performs large-scale file reads.
2. The accumulated input reaches approximately 260k tokens.
3. The session is automatically aborted.

## Expected

The session should either continue normally within supported limits or fail with a clear, actionable reason.

## Actual

The provider returns a context-window error, but the session used to exit silently because the AI SDK surfaced the terminal OpenAI raw error as `finishReason: "other"` with no usage.

## Investigation

Resolved by preserving OpenAI raw stream error details in the AI SDK adapter, classifying `context_too_large` as `context-overflow`, and routing that provider error through the existing `ContextOverflowError` compaction path instead of treating the turn as a normal unknown finish.

Regression coverage was added for both the AI SDK raw error mapping and the session processor compaction path.

## Example Session

session aborted example
sessionID: ses_0c43493cbffe1K13wnzxYklKSK
