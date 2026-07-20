# Compact Resets Model Variant To Default

**Status:** Resolved

## Summary

Running `/compact` in a session that uses a non-default model variant can cause the TUI to restore the model as default after exiting and reopening the session. The compact operation creates a synthetic user message without `model.variant`, and the TUI restores agent/model/variant from the latest user message.

## Reproduction

1. Open a TUI session using a model that supports variants.
2. Select a non-default variant, for example `high`, `xhigh`, or `minimal`.
3. Send one or more normal prompts and confirm the resulting user messages include `model.variant`.
4. Run `/compact`.
5. Exit the TUI and reopen the same session.
6. Observe that the selected variant is restored as default or empty.

## Expected

Compaction should preserve the effective session variant. Reopening a compacted session should continue using the same non-default variant unless the user explicitly changes it.

## Actual

The compact-created user message is saved without `model.variant`. Because it becomes the latest user message, TUI session restore treats the session model as variant-less and writes the model's local variant state as default.

## Investigation

Verified in source:

1. `packages/tui/src/routes/session/index.tsx` sends `/compact` through `session.summarize(...)` with only `providerID` and `modelID`.
2. `packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts` forwards only `providerID` and `modelID` to the compaction path.
3. `packages/opencode/src/session/compaction.ts` writes the compaction user message as `model: input.model`, so the synthetic user message has no `variant`.
4. `packages/tui/src/component/prompt/index.tsx` restores the active model from `lastUserMessage()` when entering a session.
5. `packages/tui/src/context/local.tsx` stores `variant.set(undefined)` as the model's `default` entry in `model.json`.
6. The local TUI variant store is keyed by provider/model, not by session, so this restore can affect later prompts that use the same model.

## Local Evidence

A read-only query against the local opencode SQLite database found a clear mismatch:

1. Session `ses_0df427fb5ffekXqIvSRbW3kWgj` has session row model `{"id":"gpt-5.5","providerID":"openai","variant":"xhigh"}`.
2. The latest user message in that session is a `compaction` part.
3. That user message model is `{"providerID":"openai","modelID":"gpt-5.5"}` with no `variant`.
4. Recent normal text user messages in the same session still include `variant:"xhigh"`.

In a sample of the 50 most recently updated sessions, this was the only session where the session row had a non-default variant while the latest user message had no variant, and the latest user message was the compaction marker.

## Root Cause

The `/compact` path does not carry the effective current variant into the synthetic compaction user message. The TUI then treats that synthetic message as the authoritative latest user model when restoring a session.

Relevant files:

```text
packages/tui/src/routes/session/index.tsx
packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts
packages/opencode/src/session/compaction.ts
packages/tui/src/component/prompt/index.tsx
packages/tui/src/context/local.tsx
```

## Impact

Users can silently lose non-default model behavior after compacting and reopening a session. Follow-up prompts may run with different reasoning effort, token usage, latency, cost, or provider-specific request options than intended.

The risk is strongest after `/compact`. A plain TUI exit and reopen is less clearly implicated when the latest user message is a normal prompt with `model.variant`, but there is still a race risk if the prompt becomes usable before session messages restore the variant.

## Proposed Fix

1. Pass the current effective variant from the TUI `/compact` command to the summarize API.
2. Extend the summarize/compaction input schema to accept an optional `variant`.
3. Store the non-default variant on the compact-created user message model.
4. Consider having TUI restore skip synthetic compaction user messages when choosing the last user model source.
5. Consider falling back to the session row model variant when the latest user message has no variant but the session model does.
6. Regenerate generated client code if public Protocol or Server `HttpApi` changes.

## Suggested Tests

1. Add a compaction regression showing `SessionCompaction.create` preserves a provided non-default variant on the synthetic user message.
2. Add an API/schema test showing summarize accepts and forwards `variant`.
3. Add a TUI restore regression showing a compacted session with session model `variant:"xhigh"` does not restore to default.
4. Add a regression where the latest user message is a compaction marker and restore either keeps the session row variant or selects the latest non-compaction user message.

## Related

1. `docs/isusses/shell-mode-loses-variant.md`
2. `docs/isusses/task-subagent-loses-model-variant.md`

## Resolution

Resolved on 2026-07-03.

Implemented changes:

1. `SessionCompaction.create` now accepts an optional model variant and falls back to the current session row variant when the compact input omits it and the provider/model match.
2. The summarize HTTP payload now accepts optional `variant` and forwards it into compaction creation.
3. TUI `/compact` now sends the currently selected model variant.
4. Public generated clients were regenerated from the updated HttpApi schema, including the legacy JS SDK v2 client.

Verification:

1. `bun test test/session/compaction.test.ts -t "inherits the current session variant when compact input omits it"` passed from `packages/opencode` after failing before the fix.
2. `bun test test/session/compaction.test.ts -t "session.compaction.create"` passed from `packages/opencode`.
3. `bun typecheck` passed from `packages/opencode`.
4. `bun typecheck` passed from `packages/tui`.
5. `bun typecheck` passed from `packages/client`.
