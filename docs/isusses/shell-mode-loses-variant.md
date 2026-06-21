# Shell Mode Resets Model Variant To Default

## Summary

Starting a new session by entering shell mode with `Shift+!` loses the currently selected model variant. After the shell command creates and navigates to the new session, the UI re-initializes the variant from the last user message and falls back to `default`.

## Reproduction

1. Select a model that supports variants.
2. Select a non-default variant, for example `high` or `minimal`.
3. In an empty prompt at cursor position 0, press `Shift+!` to enter shell mode.
4. Run a shell command to start a new session.
5. Observe the selected variant after the new session opens.

## Expected

The new session should preserve the variant selected before running the shell command.

## Actual

The selected variant is reset to `default`.

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

The app prompt submit path has the same omission:

```text
packages/app/src/components/prompt-input/submit.ts
```

## Impact

Users who run shell commands from a selected variant can silently switch back to the default variant in the newly created session. Follow-up prompts may run with different model behavior than intended.

## Proposed Fix

1. Add optional `variant` to `SessionPrompt.ShellInput`.
2. Store `input.variant` in the shell user message model metadata.
3. Pass `variant` from the TUI shell submit branch.
4. Pass `variant` from the app shell submit branch.
5. Regenerate the JavaScript SDK after updating the API schema.

## Suggested Tests

1. Add a schema decoding test showing `ShellInput` accepts `variant`.
2. Add a session prompt test showing `prompt.shell({ variant })` persists the variant on the generated user message.
3. Add or update an app prompt submit test showing shell submissions pass the selected variant.
