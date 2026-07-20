# Task 2: Task Fallback

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/tool/task.ts`
- Modify: `packages/opencode/test/tool/task.test.ts`

- [ ] **Step 1: Make the task test seed able to omit assistant variants**

In `packages/opencode/test/tool/task.test.ts`, change the `seed` helper signature and assistant message variant assignment:

```ts
const seed = Effect.fn("TaskToolTest.seed")(function* (
  title = "Pinned",
  input?: { assistantVariant?: string | null; sessionVariant?: string },
) {
```

Replace the fixed assistant `variant: "xhigh"` field with a conditional spread:

```ts
    ...(input?.assistantVariant === null ? {} : { variant: input?.assistantVariant ?? "xhigh" }),
```

Before returning from `seed`, update the session model when a session variant is requested:

```ts
  if (input?.sessionVariant) {
    yield* session.setAgentModel({
      sessionID: chat.id,
      agent: "build",
      model: {
        id: ref.modelID,
        providerID: ref.providerID,
        variant: input.sessionVariant,
      },
      time: Date.now(),
    })
  }
  return { chat, assistant }
```

- [ ] **Step 2: Add failing fallback and metadata tests**

Add these tests after the existing task creation/resume tests:

```ts
it.instance("execute falls back to the parent session variant when the assistant variant is missing", () =>
  Effect.gen(function* () {
    const { chat, assistant } = yield* seed("Pinned", { assistantVariant: null, sessionVariant: "xhigh" })
    const tool = yield* TaskTool
    const def = yield* tool.init()
    let seen: SessionPrompt.PromptInput | undefined
    const promptOps = stubOps({ onPrompt: (input) => (seen = input) })

    const result = yield* def.execute(
      {
        description: "inspect bug",
        prompt: "look into the cache key path",
        subagent_type: "general",
      },
      {
        sessionID: chat.id,
        messageID: assistant.id,
        agent: "build",
        abort: new AbortController().signal,
        extra: { promptOps },
        messages: [],
        metadata: () => Effect.void,
        ask: () => Effect.void,
      },
    )

    expect(seen?.variant).toBe("xhigh")
    expect(result.metadata.model).toEqual({
      providerID: ref.providerID,
      modelID: ref.modelID,
      variant: "xhigh",
    })
  }),
)

it.instance("execute does not inherit the parent session variant when the parent model differs", () =>
  Effect.gen(function* () {
    const sessions = yield* Session.Service
    const { chat, assistant } = yield* seed("Pinned", { assistantVariant: null })
    yield* sessions.setAgentModel({
      sessionID: chat.id,
      agent: "build",
      model: {
        id: alternate.modelID,
        providerID: alternate.providerID,
        variant: "xhigh",
      },
      time: Date.now(),
    })
    const tool = yield* TaskTool
    const def = yield* tool.init()
    let seen: SessionPrompt.PromptInput | undefined
    const promptOps = stubOps({ onPrompt: (input) => (seen = input) })

    const result = yield* def.execute(
      {
        description: "inspect bug",
        prompt: "look into the cache key path",
        subagent_type: "general",
      },
      {
        sessionID: chat.id,
        messageID: assistant.id,
        agent: "build",
        abort: new AbortController().signal,
        extra: { promptOps },
        messages: [],
        metadata: () => Effect.void,
        ask: () => Effect.void,
      },
    )

    expect(seen?.variant).toBeUndefined()
    expect(result.metadata.model).toEqual({
      providerID: ref.providerID,
      modelID: ref.modelID,
    })
  }),
)
```

Add one assertion to the explicit variant test from Task 1 so metadata also proves the selected child variant:

```ts
    expect(result.metadata.model).toEqual({
      providerID: alternate.providerID,
      modelID: alternate.modelID,
      variant: "xhigh",
    })
```

Store the execute result in that test before the assertions:

```ts
    const result = yield* def.execute(
```

- [ ] **Step 3: Run the tests to verify they fail**

Run from `packages/opencode`:

```sh
bun test test/tool/task.test.ts
```

Expected: FAIL because `TaskTool` still only uses the parent assistant message variant and task metadata does not include the effective variant.

- [ ] **Step 4: Add variant normalization helpers**

In `packages/opencode/src/tool/task.ts`, add this helper near the explicit model helpers:

```ts
function normalizeVariant(variant: string | undefined) {
  if (!variant || variant === "default") return undefined
  return variant
}
```

Use it in `parseExplicitModel` instead of the inline default check:

```ts
    variant: normalizeVariant(variant),
```

- [ ] **Step 5: Compute parent and child variants separately**

In `TaskTool.execute`, replace the Task 1 variant/model block with this version:

```ts
      const explicit = params.model ? yield* validateExplicitModel(provider, params.model) : undefined
      const inheritedModel = {
        modelID: msg.info.modelID,
        providerID: msg.info.providerID,
      }
      const model = explicit?.model ?? next.model ?? inheritedModel
      const parentVariant =
        normalizeVariant(msg.info.variant) ??
        (parent.model?.providerID === inheritedModel.providerID && parent.model.id === inheritedModel.modelID
          ? normalizeVariant(parent.model.variant)
          : undefined)
      const childVariant = explicit
        ? explicit.variant
        : next.model
          ? normalizeVariant(next.variant)
          : parentVariant
      const metadataModel = {
        modelID: model.modelID,
        providerID: model.providerID,
        ...(childVariant ? { variant: childVariant } : {}),
      }
```

Keep `parentVariant` for the background result injection into the parent session.

- [ ] **Step 6: Store effective child model metadata and pass child variant**

Update metadata creation:

```ts
      const metadata = {
        parentSessionId: ctx.sessionID,
        sessionId: nextSession.id,
        model: metadataModel,
        ...(runInBackground ? { background: true } : {}),
      }
```

Update the child prompt call:

```ts
          variant: childVariant,
```

Update the background result injection:

```ts
            variant: parentVariant,
```

- [ ] **Step 7: Run the task tests**

Run from `packages/opencode`:

```sh
bun test test/tool/task.test.ts
```

Expected: PASS for explicit model, parent fallback, existing assistant-message inheritance, and background task tests.
