# Shell Mode Variant Preservation Design

## Status

Approved direction: clients pass `variant` explicitly, and the backend defensively inherits the current session variant when shell input omits it and the resolved shell model matches the session model.

Source issue: `docs/isusses/shell-mode-loses-variant.md`.

## Problem

Shell mode creates a user message with model provider and model ID, but without the selected model variant. That variant-less shell user message can later become the source of truth for session model restoration.

The issue is visible in two user flows:

1. A user starts a new session through shell mode while a non-default variant is selected. When the session opens, the UI restores model state from the last user message. The shell-created user message has no variant, so the restored variant becomes `default`.
2. A user runs shell mode inside an existing session and then leaves before sending another normal prompt. When the session is reopened, or when another restore path reads the latest user message, the latest user message can be the shell message with no variant. The session can then resume with the default variant instead of the user's selected variant.

The failure is not in provider execution. It is a metadata propagation bug: normal prompt and slash-command paths carry `variant`, while shell mode drops it at the client API boundary and the backend cannot persist what it never receives.

## Goals

- Preserve the effective selected variant for shell mode in TUI and web app clients.
- Persist the effective variant on shell-created user messages.
- Preserve existing default semantics: no explicit variant should still mean the model default.
- Keep normal prompt, slash command, and non-variant model behavior unchanged.
- Make older or partial callers safer by deriving the current session variant when shell input omits `variant` but the current session model already has a matching non-default variant.
- Regenerate the JavaScript SDK after the HTTP API schema changes.

## Non-Goals

- Do not redesign model selection or variant storage globally.
- Do not change how users choose variants in TUI or web app.
- Do not add new variant names or provider-specific variant behavior.
- Do not migrate historical shell messages. They already lack variant metadata; the fix applies to newly created shell messages.
- Do not change shell command execution semantics, permissions, cwd handling, or output rendering.

## Existing Flow

The TUI path reads the current variant before submission:

1. `packages/tui/src/component/prompt/index.tsx` computes `const variant = local.model.variant.current()`.
2. The normal prompt branch sends `variant` to `sdk.client.session.prompt(...)`.
3. The slash-command branch sends `variant` to `sdk.client.session.command(...)`.
4. The shell branch calls `sdk.client.session.shell(...)` with `agent`, `model`, and `command`, but no `variant`.

The web app path has the same shape:

1. `packages/app/src/components/prompt-input/submit.ts` computes `const variant = local.model.variant.current()` and includes it in the draft.
2. Normal prompt and slash-command branches send the draft variant.
3. The shell branch calls `client.session.shell(...)` with `agent`, `model`, and `command`, but no `variant`.

The backend path cannot receive or persist shell variants today:

1. `packages/opencode/src/session/prompt.ts` defines `ShellInput` with `sessionID`, `messageID`, `agent`, `model`, and `command`.
2. `SessionPrompt.shellImpl` resolves a model from `input.model`, `agent.model`, or `currentModel(input.sessionID)`.
3. `shellImpl` stores the shell user message as `model: { providerID, modelID }`, without `variant`.
4. The SDK generated methods for `session.shell` do not expose a `variant` parameter because the schema lacks it.

The restore paths make the missing metadata observable:

1. TUI initializes agent/model/variant from the last user message when the session ID changes. If that message has no variant, it calls `local.model.variant.set(undefined)`, which stores `default` for the model.
2. The web app watches `lastUserMessage()?.id` and calls `syncSessionModel(local, msg)`. `local.session.restore(...)` stores `msg.model?.variant ?? null` when no session-local selection exists.
3. The backend `currentModel(sessionID)` can fall back to the newest user message with model metadata when the session row has no explicit model state.

## Design

Add shell variant support at the same boundaries already used by prompt and command submissions.

`SessionPrompt.ShellInput` should gain an optional `variant` field next to `model`. The HTTP API payload for `/session/{sessionID}/shell` is derived from this schema, so adding the field there makes the endpoint accept shell variants and exposes the field in generated SDK types after regeneration.

The TUI shell branch should pass the same `variant` value it already computes for prompt and command submissions:

```text
packages/tui/src/component/prompt/index.tsx
```

The web app shell branch should pass the same draft `variant` value it already passes to prompt and command submissions:

```text
packages/app/src/components/prompt-input/submit.ts
```

`SessionPrompt.shellImpl` should compute an effective variant before writing the shell user message. The effective variant should follow this order:

1. Use `input.variant` when provided and not equal to `default`.
2. If no input variant is provided, read the current session model and reuse its variant only when it matches the resolved shell model's `providerID` and `modelID`.
3. If the agent has a configured variant for the same resolved model and that variant is valid for the model, use that configured variant.
4. Otherwise leave the variant undefined.

The shell user message should be stored with `model: { providerID, modelID, variant }`, matching normal prompt message metadata. Literal `default` should not be persisted as a user-message variant; it should normalize to `undefined` to preserve existing default semantics.

The shell assistant message should also store the effective variant if assistant message metadata is expected to describe the model turn. Existing synthetic task assistant messages already carry variants, so keeping shell assistant metadata aligned avoids future UI or processing code having to infer variant from the parent user message.

After the schema change, regenerate the JavaScript SDK with:

```text
./packages/sdk/js/script/build.ts
```

## User-Facing Behavior

When a user runs shell mode with a non-default variant selected, shell mode should behave like a normal prompt for model metadata purposes. The selected variant should still be shown after creating a new shell-started session, after returning to an existing session whose latest user message is the shell message, and after sending follow-up prompts.

If the selected variant is default or no valid variant exists for the current model, the shell message should continue to omit the variant and restore default behavior.

No new UI copy is required. The bug is fixed by preserving existing selection state.

## Error Handling

Invalid model handling remains unchanged. If the resolved shell model is invalid, existing model lookup and agent validation behavior should still report the same errors.

Invalid or stale variants should not make shell submission fail. If a provided or derived variant is not in the resolved model's variant list, ignore it and store no variant. This matches the current client-side behavior where `local.model.variant.current()` returns `undefined` for invalid selections.

Older clients that call shell without `variant` should still work. They should benefit from the backend fallback when the current session model already has a matching non-default variant, but they should not be forced to send the new field.

## Testing

Add focused regression coverage around the propagation chain:

- Backend schema test: `ShellInput` accepts optional `variant` and still accepts payloads without it.
- Backend shell prompt test: `prompt.shell({ variant })` persists that variant on the shell-created user message.
- Backend fallback test: when shell input omits `variant`, the resolved model matches the current session model, and the current session model has a non-default variant, the shell user message preserves that variant.
- Backend default test: `variant: "default"` or an invalid variant is normalized to no user-message variant.
- TUI prompt submit test: shell mode includes the currently selected variant in `session.shell` input.
- Web app prompt submit test: shell mode includes the draft/current variant in `client.session.shell` input.
- Web app restore test: a shell-created user message with a variant does not reset a session-local follow-up variant to default.
- Control tests: normal prompt and slash-command submissions still pass variants as before, and shell submissions without variants still work for default models.

Run tests from package directories, not from the repo root. Run `bun typecheck` from affected package directories after implementation.

## Acceptance Criteria

- `SessionPrompt.ShellInput` accepts optional `variant`.
- TUI shell submissions send the current variant when one is selected.
- Web app shell submissions send the current variant when one is selected.
- Shell-created user messages persist the effective non-default variant.
- Reopening a shell-started new session preserves the selected non-default variant.
- Reopening an existing session whose latest user message is a shell message preserves the selected non-default variant when it was available at shell submission time.
- Existing default-variant behavior is unchanged.
- Existing prompt and command variant behavior is unchanged.
- JavaScript SDK types expose the new shell `variant` field after regeneration.
