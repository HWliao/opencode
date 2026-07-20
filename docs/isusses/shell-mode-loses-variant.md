# Shell Mode Resets Model Variant To Default

**Status:** Resolved

## Summary

Entering shell mode with `Shift+!` drops the currently selected model variant from the shell-created user message. This is not limited to new sessions: any client or backend path that restores the effective model from the latest user message can treat the shell message as a variant-less model selection, causing follow-up prompts to run with the default variant.

## Reproduction

New session case:

1. Select a model that supports variants.
2. Select a non-default variant, for example `high` or `minimal`.
3. In an empty prompt at cursor position 0, press `Shift+!` to enter shell mode.
4. Run a shell command to start a new session.
5. Observe the selected variant after the new session opens.

Existing session case:

1. Open an existing session using a model with a non-default variant.
2. Run a shell command through shell mode.
3. Inspect the shell-created user message or continue after the client restores model selection from the latest user message/session state.
4. Observe that the shell user message has only `providerID` and `modelID`, with no `variant`, and later prompts can fall back to the default variant.

## Expected

Shell mode should preserve the effective variant selected before running the shell command. New sessions and existing sessions should keep using the same variant for follow-up prompts unless the user explicitly changes it.

## Actual

The shell-created user message is saved without `model.variant`. New sessions reset to `default` when they initialize from that message. Existing sessions can also lose the variant when the client or backend resolves model state from the latest user message after the shell command.

## Investigation

Verified in source:

1. `packages/tui/src/component/prompt/index.tsx` reads `local.model.variant.current()` before submit, and normal prompt plus slash-command branches pass `variant`. The shell branch calls `sdk.client.session.shell(...)` with only `agent`, `model`, and `command`.
2. `packages/app/src/components/prompt-input/submit.ts` builds a draft with `variant`, and normal prompt plus slash-command branches pass it. The shell branch calls `client.session.shell(...)` with only `agent`, `model`, and `command`.
3. `packages/opencode/src/session/prompt.ts` defines `ShellInput` with `sessionID`, `messageID`, `agent`, `model`, and `command`, but no `variant`.
4. `SessionPrompt.shellImpl` stores the shell-created user message as `model: { providerID, modelID }`, without `variant`.
5. The backend `currentModel(sessionID)` can fall back to the newest user message with model metadata when the session row has no explicit model state.
6. The web app runs `syncSessionModel(local, lastUserMessage)` when the last user message changes; `local.session.restore(...)` initializes session-local model state from `msg.model?.variant ?? null` when no saved selection exists. A shell user message without `variant` can therefore become the restored session model state for an active session.

## Root Cause

The shell submit path reads the selected variant but does not pass it to the `session.shell` API.

Relevant TUI path:

```text
packages/tui/src/component/prompt/index.tsx
```

The normal prompt and slash command branches include `variant`, but the shell branch only sends `agent`, `model`, and `command`.

The backend schema also does not accept a shell variant:

```text
packages/opencode/src/session/prompt.ts
```

`ShellInput` includes `sessionID`, `messageID`, `agent`, `model`, and `command`, but no `variant` field. `shellImpl` then creates the synthetic user message with only `providerID` and `modelID`, so the message has no variant.

When the new session opens, the TUI initializes agent/model/variant from the last user message. Because the shell user message has no variant, the UI calls `local.model.variant.set(undefined)`, which stores `default` for the model.

For existing sessions, the same missing metadata can affect any model restoration path that treats the latest user message as the current model source. In the web app, the session page syncs local model state from `lastUserMessage`, and `local.session.restore` stores `msg.model?.variant ?? null` when the session has no saved local selection.

The app prompt submit path has the same omission:

```text
packages/app/src/components/prompt-input/submit.ts
```

## Impact

Users who run shell commands from a selected variant can silently switch back to the default variant. This affects newly created sessions and can also affect existing sessions after model state is restored from the shell-created user message. Follow-up prompts may run with different reasoning effort, output behavior, token usage, or provider-specific request options than intended.

## Proposed Fix

1. Add optional `variant` to `SessionPrompt.ShellInput`.
2. Store `input.variant` in the shell user message model metadata.
3. Pass `variant` from the TUI shell submit branch.
4. Pass `variant` from the app shell submit branch.
5. Preserve the effective current variant in shell execution when `input.variant` is omitted but the current session model already has a non-default variant.
6. Consider storing the same variant on the shell assistant message if assistant message metadata is expected to reflect the provider turn.
7. Regenerate the JavaScript SDK after updating the API schema.

## Suggested Tests

1. Add a schema decoding test showing `ShellInput` accepts `variant`.
2. Add a session prompt test showing `prompt.shell({ variant })` persists the variant on the generated user message.
3. Add a session prompt regression showing shell mode preserves an existing session's effective variant when the caller omits `variant` but the current session model has one.
4. Add or update a TUI prompt submit test showing shell submissions pass the selected variant.
5. Add or update an app prompt submit test showing shell submissions pass the selected variant.
6. Add a web app session-model regression showing a shell-created user message with a variant does not reset an active session's follow-up variant.
