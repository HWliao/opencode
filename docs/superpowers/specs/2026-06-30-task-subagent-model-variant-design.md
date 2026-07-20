# Task Subagent Model Variant Design

## Problem

Task subagents can lose the effective model variant inherited from the parent session. The current `TaskTool` path reads the parent assistant message variant and passes it to the child prompt only when the subagent has no custom model. If that assistant message has no variant, the child prompt receives no variant even when the parent session model state still has one.

The TUI also needs to make this visible. When inspecting a subagent, the existing bottom model display should append the subagent's non-default variant the same way the main session bottom status line already does.

## Goals

- Preserve the parent session variant for task subagents when the parent assistant message lacks variant metadata.
- Add an optional `task` tool `model` parameter that fully selects `providerID`, `modelID`, and optional `variant` as one atomic source.
- Fail fast on invalid explicit task model input instead of falling back silently.
- Surface the effective subagent variant in the existing TUI bottom model display.
- Keep the change scoped to `TaskTool` and subagent TUI state; do not change global prompt variant semantics.

## Non-Goals

- Do not change `SessionPrompt.createUserMessage` to inherit `currentModel(sessionID).variant` globally.
- Do not add a new UI location for subagent model details.
- Do not display `default` as a variant.
- Do not change model or variant selection for normal prompts, commands, shell mode, or non-task tools.

## Current Behavior

`TaskTool` currently builds the child model from the subagent config or parent assistant message:

- `next.model` wins when the target subagent config has a model.
- Otherwise the parent assistant message `providerID` and `modelID` are inherited.
- Variant is read from `msg.info.variant`.
- Variant is passed to the child prompt only when `next.model` is absent.

This means a parent session can have a current model variant while the specific assistant message used by the `task` tool has no variant. In that case, the child prompt runs with default model options.

## Model Selection

`task` gains an optional `model` parameter with these accepted forms:

```text
providerID/modelID
providerID/modelID(variant)
```

The model choice is atomic. `providerID`, `modelID`, and `variant` always come from the same source.

Selection priority:

1. If `params.model` is present, parse and validate it. This fully determines the child model and variant.
2. Otherwise, if the subagent config has `next.model`, use `next.model` and the matching `next.variant` from the same subagent config source.
3. Otherwise, inherit the parent model. Use the parent assistant message model, and compute an effective inherited variant from the parent assistant message first, then the parent session model fallback.

Explicit model examples:

- `openai/gpt-5` selects `openai/gpt-5` with default variant.
- `openai/gpt-5(high)` selects `openai/gpt-5` with `high` variant.

An explicit model without a variant must not inherit the parent variant. It means default variant for that explicit model.

## Validation

Invalid explicit `model` input fails immediately with a clear error. It does not fall back to the subagent config or parent session.

Validation requirements:

- Reject malformed strings that do not contain a provider and model separated by `/`.
- Reject empty provider, empty model, empty variant, or unbalanced parentheses.
- Call the provider service to verify the provider/model exists.
- If a variant is present, verify it exists in the selected provider model's `variants` map.
- Normalize `default` to no variant so default behavior stays implicit.

## Parent Variant Fallback

When no explicit task model and no subagent-configured model are present, `TaskTool` computes an inherited variant:

1. Prefer `msg.info.variant` from the parent assistant message.
2. If missing, use `parent.model.variant` only when the parent session model matches the inherited parent assistant message model.
3. Treat `default` as no variant.

This is intentionally TaskTool-only. The broader prompt system may still create messages with missing variants when `input.variant` is omitted; this design does not change that global behavior.

## Metadata

Task metadata records the actual child model selection so downstream UI can display it without extra session lookups:

```ts
metadata: {
  parentSessionId,
  sessionId,
  model: {
    providerID,
    modelID,
    variant,
  },
}
```

`variant` is omitted when it is default or undefined. Background metadata keeps the existing `background` and `jobId` fields.

## TUI Display

The TUI should not add a new subagent model display. It should update the existing bottom status line behavior.

Data flow:

- `TaskTool` writes the effective model and non-default variant into task metadata.
- `subagent-data.ts` reads `metadata.model` when building `FooterSubagentTab`.
- `FooterSubagentTab` gains an optional `model` field containing `providerID`, `modelID`, and optional `variant`.
- `sameSubagentTab` includes this field so a model or variant change refreshes the UI.
- `footer.view.tsx` reuses the existing bottom model rendering path.

Display rule:

- When the user is inspecting a subagent, the bottom model display uses the selected subagent tab's model.
- If the selected subagent model has a non-default variant, append it beside the model name using the same warning/bold style as the main session variant.
- If the variant is `default` or missing, show only the model name.
- When no subagent is selected, keep the current main session model and variant behavior.

## Error Handling

Errors from explicit task model parsing or validation are user-visible task tool errors. They should identify the invalid model string and the reason, such as invalid format, unknown model, or unavailable variant.

Inherited model fallback should not introduce new failures beyond existing parent message/session lookup failures. If the parent session model variant does not match the inherited parent message model, ignore the session variant and use default.

## Tests

Add or update tests in `packages/opencode/test/tool/task.test.ts`:

- Parent assistant message lacks `variant`, parent session model has `variant: "xhigh"`, and the subagent has no configured model. Assert the child prompt receives `variant: "xhigh"`.
- Parent assistant message variant still wins when present.
- `params.model: "provider/model"` uses that provider/model and passes no variant.
- `params.model: "provider/model(xhigh)"` uses that provider/model and `xhigh`.
- Malformed model, unknown model, and unknown variant fail without fallback.
- Existing subagent-configured model behavior remains intact.

Add or update tests in `packages/opencode/test/cli/run/subagent-data.test.ts`:

- Task metadata with `model.variant: "xhigh"` appears in the subagent tab model.
- Task metadata with `variant: "default"` or no variant does not expose a displayable variant.
- `sameSubagentTab` changes when model or variant changes.

Run from `packages/opencode`:

```sh
bun test test/tool/task.test.ts test/cli/run/subagent-data.test.ts
bun typecheck
```

## Acceptance Criteria

- Task subagents inherit a non-default parent session variant when the parent assistant message lacks one and no explicit/subagent-configured model overrides it.
- Explicit `task.model` fully controls provider, model, and variant, and invalid input fails immediately.
- Task metadata contains the effective child model and non-default variant.
- Inspecting a subagent in the TUI shows the existing bottom model name with the non-default variant appended, matching main session styling.
- Default variants are not displayed.
- Existing task behavior remains unchanged when no variant or explicit model is involved.
