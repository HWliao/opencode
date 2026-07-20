# Task 2: shell-metadata

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/session/prompt.ts:435-487`
- Modify: `packages/opencode/test/session/prompt.test.ts:1396-1560`
- Modify: `packages/opencode/test/session/prompt.test.ts:2171-2240`

- [ ] **Step 1: Add explicit variant shell regression**

Add this test near the `// Shell semantics` section in `packages/opencode/test/session/prompt.test.ts`:

```ts
unixNoLLMServer(
  "shell persists explicit model variant",
  () =>
    Effect.gen(function* () {
      const { prompt, sessions, chat } = yield* boot()
      const result = yield* prompt.shell({
        sessionID: chat.id,
        agent: "build",
        variant: "high",
        command: "printf variant",
      })

      const messages = yield* sessions.messages({ sessionID: chat.id })
      const shellUser = messages.findLast((msg) => msg.info.role === "user")
      expect(shellUser?.info.role).toBe("user")
      if (shellUser?.info.role === "user") {
        expect(shellUser.info.model.variant).toBe("high")
      }

      expect(result.info.role).toBe("assistant")
      if (result.info.role === "assistant") {
        expect(result.info.variant).toBe("high")
      }
    }),
  {
    config: {
      ...cfg,
      provider: {
        ...cfg.provider,
        test: {
          ...cfg.provider.test,
          models: {
            "test-model": {
              ...cfg.provider.test.models["test-model"],
              variants: { high: {}, xhigh: {} },
            },
          },
        },
      },
    },
  },
)
```

- [ ] **Step 2: Add backend fallback shell regression**

Add this test near the explicit variant shell regression:

```ts
unixNoLLMServer(
  "shell inherits current session variant when input omits variant",
  () =>
    Effect.gen(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({
        model: {
          providerID: ProviderV2.ID.make("test"),
          id: ModelV2.ID.make("test-model"),
          variant: "xhigh",
        },
      })

      yield* prompt.shell({
        sessionID: chat.id,
        agent: "build",
        model: { providerID: ProviderV2.ID.make("test"), modelID: ModelV2.ID.make("test-model") },
        command: "printf inherited",
      })

      const messages = yield* sessions.messages({ sessionID: chat.id })
      const shellUser = messages.findLast((msg) => msg.info.role === "user")
      expect(shellUser?.info.role).toBe("user")
      if (shellUser?.info.role === "user") {
        expect(shellUser.info.model.variant).toBe("xhigh")
      }
    }),
  {
    config: {
      ...cfg,
      provider: {
        ...cfg.provider,
        test: {
          ...cfg.provider.test,
          models: {
            "test-model": {
              ...cfg.provider.test.models["test-model"],
              variants: { high: {}, xhigh: {} },
            },
          },
        },
      },
    },
  },
)
```

- [ ] **Step 3: Run the new backend shell tests and confirm they fail**

Run from `packages/opencode` on Unix-like platforms:

```bash
bun test test/session/prompt.test.ts --timeout 30000
```

Expected result before implementation: at least one new shell variant assertion fails because shell user messages do not persist `variant`.

On Windows, the `unixNoLLMServer` tests are skipped. In that case, rely on Task 1 schema coverage plus typecheck locally, and let CI on Unix exercise these shell regressions.

- [ ] **Step 4: Implement effective shell variant resolution**

In `SessionPrompt.shellImpl`, replace the current model assignment and message metadata with an effective variant calculation. Keep the code in the existing function unless the validation expression becomes hard to read.

Use this shape inside the `Effect.gen` block after the agent is resolved:

```ts
const model = input.model ?? agent.model ?? (yield* currentModel(input.sessionID))
const current = yield* currentModel(input.sessionID)
const sameCurrent = current.providerID === model.providerID && current.modelID === model.modelID
const full = yield* provider
  .getModel(model.providerID, model.modelID)
  .pipe(Effect.catchIf(Provider.ModelNotFoundError.isInstance, () => Effect.succeed(undefined)))
const agentVariant =
  agent.model?.providerID === model.providerID && agent.model.modelID === model.modelID ? agent.variant : undefined
const variant = [input.variant, sameCurrent ? current.variant : undefined, agentVariant].find(
  (value): value is string => Boolean(value && value !== "default" && full?.variants?.[value]),
)
```

- [ ] **Step 5: Persist the variant on shell messages**

Update the shell user message model metadata:

```ts
model: { providerID: model.providerID, modelID: model.modelID, variant },
```

Update the shell assistant message metadata if assistant message variants are expected to describe the provider turn:

```ts
variant,
```

Place `variant` near `agent` or near `providerID/modelID` in the assistant message object.

- [ ] **Step 6: Run backend shell tests**

Run from `packages/opencode`:

```bash
bun test test/session/prompt.test.ts --timeout 30000
```

Expected result after implementation on Unix-like platforms: new shell variant tests pass, existing shell tests still pass. On Windows, shell tests that use `unixNoLLMServer` are skipped by design.

- [ ] **Step 7: Run backend typecheck**

Run from `packages/opencode`:

```bash
bun typecheck
```

Expected result after implementation: typecheck passes after Task 3 regenerates SDK; if it fails only because generated SDK types are stale, continue to Task 3 and rerun.
