# Task 5: windows-tests

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/test/session/prompt.test.ts`

- [ ] **Step 1: Add cross-platform shell variant regressions**

The existing shell variant regressions use `unixNoLLMServer`, so they are skipped on Windows. Add corresponding cross-platform tests that run through the real shell path with a command that works on Windows and Unix.

Use a small JavaScript command executed through Bun so command syntax is stable across shells:

```ts
const shellVariantCommand = `bun -e "process.stdout.write('variant')"`
```

Add tests near the existing shell variant regressions in `packages/opencode/test/session/prompt.test.ts`:

```ts
noLLMServer.instance(
  "shell persists explicit model variant across platforms",
  () =>
    Effect.gen(function* () {
      const { prompt, sessions, chat } = yield* boot()
      const result = yield* prompt.shell({
        sessionID: chat.id,
        agent: "build",
        variant: "high",
        command: shellVariantCommand,
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

Add the fallback equivalent using `shellVariantCommand` and assert both user and assistant metadata variant equal `"xhigh"`.

- [ ] **Step 2: Run the focused cross-platform variant tests**

Run from `packages/opencode`:

```bash
bun test test/session/prompt.test.ts -t "across platforms" --timeout 30000
```

Expected result: the two cross-platform shell variant tests pass on Windows.

- [ ] **Step 3: Run backend typecheck**

Run from `packages/opencode`:

```bash
bun typecheck
```

Expected result: typecheck passes.

- [ ] **Step 4: Keep existing Unix tests**

Do not remove the existing `unixNoLLMServer` shell tests. They continue covering the existing Unix shell suite. The new tests add Windows/current-platform coverage for this variant metadata behavior.
