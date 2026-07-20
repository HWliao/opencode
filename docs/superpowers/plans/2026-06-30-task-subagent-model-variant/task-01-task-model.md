# Task 1: Task Model

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/tool/task.ts`
- Modify: `packages/opencode/src/tool/task.txt`
- Modify: `packages/opencode/test/tool/task.test.ts`

- [ ] **Step 1: Add failing explicit model tests**

In `packages/opencode/test/tool/task.test.ts`, add the provider namespace import near the existing imports:

```ts
import { Provider } from "@/provider/provider"
```

Add a second model constant after `ref`:

```ts
const alternate = {
  providerID: ProviderV2.ID.make("other"),
  modelID: ModelV2.ID.make("other-model"),
}
```

Update the `layer` helper to provide a test provider service. Keep the existing layer contents and add `Provider.Service` to `Layer.mergeAll`:

```ts
const testProvider = Layer.succeed(Provider.Service, {
  list: () => Effect.succeed({}),
  getProvider: () => Effect.die(new Error("not used")),
  getModel: (providerID, modelID) =>
    providerID === alternate.providerID && modelID === alternate.modelID
      ? Effect.succeed({ variants: { xhigh: {}, minimal: {} } } as Provider.Model)
      : Effect.fail(new Provider.ModelNotFoundError({ providerID, modelID })),
  getLanguage: () => Effect.die(new Error("not used")),
  closest: () => Effect.succeed(undefined),
  getSmallModel: () => Effect.succeed(undefined),
  defaultModel: () => Effect.succeed(ref),
})

const layer = (flags: Partial<RuntimeFlags.Info> = {}) =>
  Layer.mergeAll(
    Agent.defaultLayer,
    BackgroundJob.defaultLayer,
    EventV2Bridge.defaultLayer,
    Config.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Session.defaultLayer,
    SessionRunState.defaultLayer,
    SessionStatus.defaultLayer,
    Truncate.defaultLayer,
    ToolRegistry.defaultLayer,
    Database.defaultLayer,
    testProvider,
    RuntimeFlags.layer(flags),
  ).pipe(Layer.provide(Ripgrep.defaultLayer))
```

Add tests inside `describe("tool.task", ...)` after the existing resume/create tests:

```ts
it.instance("execute uses an explicit task model without a variant", () =>
  Effect.gen(function* () {
    const { chat, assistant } = yield* seed()
    const tool = yield* TaskTool
    const def = yield* tool.init()
    let seen: SessionPrompt.PromptInput | undefined
    const promptOps = stubOps({ onPrompt: (input) => (seen = input) })

    yield* def.execute(
      {
        description: "inspect bug",
        prompt: "look into the cache key path",
        subagent_type: "general",
        model: "other/other-model",
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

    expect(seen?.model).toEqual(alternate)
    expect(seen?.variant).toBeUndefined()
  }),
)

it.instance("execute uses an explicit task model variant", () =>
  Effect.gen(function* () {
    const { chat, assistant } = yield* seed()
    const tool = yield* TaskTool
    const def = yield* tool.init()
    let seen: SessionPrompt.PromptInput | undefined
    const promptOps = stubOps({ onPrompt: (input) => (seen = input) })

    yield* def.execute(
      {
        description: "inspect bug",
        prompt: "look into the cache key path",
        subagent_type: "general",
        model: "other/other-model(xhigh)",
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

    expect(seen?.model).toEqual(alternate)
    expect(seen?.variant).toBe("xhigh")
  }),
)

it.instance("execute fails invalid explicit task models without fallback", () =>
  Effect.gen(function* () {
    const { chat, assistant } = yield* seed()
    const tool = yield* TaskTool
    const def = yield* tool.init()
    const promptOps = stubOps()

    const exec = (model: string) =>
      def.execute(
        {
          description: "inspect bug",
          prompt: "look into the cache key path",
          subagent_type: "general",
          model,
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
      ).pipe(Effect.exit)

    const malformed = yield* exec("other")
    const unknownModel = yield* exec("other/missing")
    const unknownVariant = yield* exec("other/other-model(unknown)")

    expect(Exit.isFailure(malformed)).toBe(true)
    expect(Exit.isFailure(unknownModel)).toBe(true)
    expect(Exit.isFailure(unknownVariant)).toBe(true)
  }),
)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `packages/opencode`:

```sh
bun test test/tool/task.test.ts
```

Expected: FAIL because `Parameters` does not yet include `model`, and `TaskTool` does not parse or validate explicit model strings.

- [ ] **Step 3: Add the `model` parameter and Provider service**

In `packages/opencode/src/tool/task.ts`, add this import:

```ts
import { Provider } from "@/provider/provider"
```

Add `model` to `BaseParameterFields` after `subagent_type`:

```ts
  model: Schema.optional(Schema.String).annotate({
    description:
      "Optional model override for this task, formatted as providerID/modelID or providerID/modelID(variant). If set, provider, model, and variant all come from this value.",
  }),
```

Bind the provider service near the existing service bindings:

```ts
    const provider = yield* Provider.Service
```

- [ ] **Step 4: Add explicit model parsing and validation helpers**

In `packages/opencode/src/tool/task.ts`, add these helpers below `renderOutput`:

```ts
function parseExplicitModel(input: string) {
  const fail = (reason: string) => new Error(`Invalid task model "${input}": ${reason}`)
  const open = input.lastIndexOf("(")
  const hasOpen = open !== -1
  const hasClose = input.endsWith(")")
  if ((input.includes("(") || input.includes(")")) && (!hasOpen || !hasClose || open === input.length - 2)) {
    return { error: fail("expected providerID/modelID or providerID/modelID(variant)") }
  }

  const body = hasOpen ? input.slice(0, open) : input
  const slash = body.indexOf("/")
  if (slash <= 0 || slash === body.length - 1) {
    return { error: fail("expected providerID/modelID or providerID/modelID(variant)") }
  }

  const variant = hasOpen ? input.slice(open + 1, -1).trim() : undefined
  if (variant === "") {
    return { error: fail("variant cannot be empty") }
  }

  return {
    model: Provider.parseModel(body),
    variant: variant === "default" ? undefined : variant,
  }
}

const validateExplicitModel = Effect.fn("TaskTool.validateExplicitModel")(function* (
  provider: Provider.Interface,
  input: string,
) {
  const parsed = parseExplicitModel(input)
  if ("error" in parsed) return yield* Effect.fail(parsed.error)

  const full = yield* provider.getModel(parsed.model.providerID, parsed.model.modelID).pipe(
    Effect.catchIf(Provider.ModelNotFoundError.isInstance, () =>
      Effect.fail(new Error(`Invalid task model "${input}": model not found`)),
    ),
  )
  if (parsed.variant && !full.variants?.[parsed.variant]) {
    return yield* Effect.fail(new Error(`Invalid task model "${input}": variant not found`))
  }

  return parsed
})
```

- [ ] **Step 5: Use explicit model selection in `run`**

In `TaskTool.execute`, replace the current `model` assignment with explicit selection:

```ts
      const explicit = params.model ? yield* validateExplicitModel(provider, params.model) : undefined
      const parentVariant = msg.info.variant === "default" ? undefined : msg.info.variant
      const model = explicit?.model ?? next.model ?? {
        modelID: msg.info.modelID,
        providerID: msg.info.providerID,
      }
      const childVariant = explicit ? explicit.variant : next.model ? undefined : parentVariant
```

Update the child prompt call so explicit model variants are passed:

```ts
          variant: childVariant,
```

Update the background result injection to keep using the parent-session variant, not the child task variant:

```ts
            variant: parentVariant,
```

- [ ] **Step 6: Document the new task parameter**

In `packages/opencode/src/tool/task.txt`, add this usage note after the existing note 6 and renumber the current note 7 to 8:

```text
7. If you need a specific model for the subagent, pass model as providerID/modelID or providerID/modelID(variant). The model override is atomic: provider, model, and variant all come from that value.
```

- [ ] **Step 7: Run the task tests**

Run from `packages/opencode`:

```sh
bun test test/tool/task.test.ts
```

Expected: PASS for the new explicit model tests and existing task tests.
