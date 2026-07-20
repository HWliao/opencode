# Task 1: backend-schema

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/session/prompt.ts:1607-1613`
- Modify: `packages/opencode/test/session/schema-decoding.test.ts:270-276`

- [ ] **Step 1: Write the schema regression**

Update the existing `ShellInput requires agent + command` test so it verifies both old callers and new callers:

```ts
test("ShellInput accepts optional variant", () => {
  const decode = decodeUnknown(SessionPrompt.ShellInput)
  const base = { sessionID, agent: "build", command: "echo hi" }
  const withVariant = { ...base, variant: "high" }

  expect(decode(base)).toEqual(base)
  expect(decode(withVariant)).toEqual(withVariant)
  expect(() => decode({ sessionID })).toThrow()
})
```

Remove or rename the old test body so there is one shell schema test with the name above.

- [ ] **Step 2: Run the schema test and confirm it fails**

Run from `packages/opencode`:

```bash
bun test test/session/schema-decoding.test.ts
```

Expected result before implementation: the new variant assertion fails because `SessionPrompt.ShellInput` strips or rejects `variant`.

- [ ] **Step 3: Add `variant` to `ShellInput`**

Modify `packages/opencode/src/session/prompt.ts`:

```ts
export const ShellInput = Schema.Struct({
  sessionID: SessionID,
  messageID: Schema.optional(MessageID),
  agent: Schema.String,
  model: Schema.optional(ModelRef),
  variant: Schema.optional(Schema.String),
  command: Schema.String,
})
```

Keep `variant` next to `model`, matching `PromptInput` and `CommandInput`.

- [ ] **Step 4: Run the schema test and confirm it passes**

Run from `packages/opencode`:

```bash
bun test test/session/schema-decoding.test.ts
```

Expected result after implementation: the `SessionPrompt input schemas` tests pass.

- [ ] **Step 5: Check backend types for the schema-only change**

Run from `packages/opencode`:

```bash
bun typecheck
```

Expected result after implementation: typecheck passes, or only fails later because generated SDK clients have not been regenerated. If SDK-related failures appear, continue to Task 3 before treating them as blockers.
