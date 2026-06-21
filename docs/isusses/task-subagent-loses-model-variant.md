# Task Subagents Lose Inherited Model Variant

## Summary

When the `task` tool starts a subagent without an explicitly configured model or variant, the subagent inherits the parent session model but may fail to inherit the parent session variant.

## Reproduction

1. Select a model that supports variants.
2. Select a non-default variant, for example `high` or `minimal`.
3. Start a normal session using that model and variant.
4. Ask the assistant to delegate work through the `task` tool to a subagent that has no custom model configured.
5. Observe the child task session model metadata and request behavior.

## Expected

The child task should inherit both the parent model and the effective parent variant.

## Actual

The child task inherits only the parent model. The variant can be missing, causing the child request to run with default model options.

## Root Cause

`TaskTool` reads the parent assistant message variant and passes it to the child prompt only when the subagent has no custom model:

```text
packages/opencode/src/tool/task.ts
```

However, the parent assistant message can have no `variant` even when the parent session's current model state includes one. In that case, `TaskTool` has no fallback to the parent session model variant.

The prompt creation path also only stores `input.variant` or an agent-configured variant:

```text
packages/opencode/src/session/prompt.ts
```

It does not preserve the variant from `currentModel(sessionID)` when `input.variant` is omitted.

## Impact

Subagents may silently run with default model behavior despite the parent session using a non-default variant. This can change reasoning effort, output style, token usage, or provider-specific request options.

## Proposed Fix

1. In `TaskTool`, compute an effective inherited variant.
2. Prefer `msg.info.variant`.
3. If missing and the subagent has no custom model, fall back to `parent.model.variant` when it matches the inherited model.
4. Normalize `"default"` to `undefined` to preserve existing default semantics.
5. Include the effective variant in the child prompt and task metadata.

## Suggested Tests

1. Add a `test/tool/task.test.ts` regression where the parent session model has `variant: "xhigh"` but the parent assistant message has no `variant`.
2. Execute the `task` tool with a subagent that has no custom model.
3. Assert `promptOps.prompt` receives `variant: "xhigh"`.
4. Keep existing coverage showing assistant-message variants are still inherited.
