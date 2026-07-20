# Task 4: client-variant

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/app/src/components/prompt-input/submit.ts:452-460`
- Modify: `packages/app/src/components/prompt-input/submit.test.ts:21-22`
- Modify: `packages/app/src/components/prompt-input/submit.test.ts:307-340`
- Modify: `packages/tui/src/component/prompt/index.tsx:1055-1065`

- [ ] **Step 1: Make the web app test capture shell payloads**

In `packages/app/src/components/prompt-input/submit.test.ts`, change `sentShell` from a string array to captured payloads:

```ts
const sentShell: Array<{
  directory: string
  input: {
    sessionID: string
    agent: string
    model: { providerID: string; modelID: string }
    variant?: string
    command: string
  }
}> = []
```

Update the mock client shell method:

```ts
shell: async (input: {
  sessionID: string
  agent: string
  model: { providerID: string; modelID: string }
  variant?: string
  command: string
}) => {
  sentShell.push({ directory, input })
  return { data: undefined }
},
```

Update existing expectations that currently compare `sentShell` to directories:

```ts
expect(sentShell.map((item) => item.directory)).toEqual(["/repo/worktree-a", "/repo/worktree-b"])
```

- [ ] **Step 2: Add web app shell variant regression**

Add this test near `includes the selected variant on optimistic prompts`:

```ts
test("includes the selected variant on shell submissions", async () => {
  params = { id: "session-1" }
  variant = "high"

  const submit = createPromptSubmit({
    prompt,
    info: () => ({ id: "session-1" }),
    imageAttachments: () => [],
    commentCount: () => 0,
    autoAccept: () => false,
    mode: () => "shell",
    working: () => false,
    editor: () => undefined,
    queueScroll: () => undefined,
    promptLength: (value) => value.reduce((sum, part) => sum + ("content" in part ? part.content.length : 0), 0),
    addToHistory: () => undefined,
    resetHistoryNavigation: () => undefined,
    setMode: () => undefined,
    setPopover: () => undefined,
    onSubmit: () => undefined,
  })

  const event = { preventDefault: () => undefined } as unknown as Event

  await submit.handleSubmit(event)

  expect(sentShell).toHaveLength(1)
  expect(sentShell[0]?.input).toMatchObject({
    sessionID: "session-1",
    agent: "agent",
    model: { providerID: "provider", modelID: "model" },
    variant: "high",
    command: "ls",
  })
})
```

- [ ] **Step 3: Run app submit test and confirm it fails**

Run from `packages/app`:

```bash
bun test --preload ./happydom.ts ./src/components/prompt-input/submit.test.ts
```

Expected result before implementation: the new shell variant assertion fails because shell submissions omit `variant`.

- [ ] **Step 4: Pass variant from the web app shell branch**

Modify `packages/app/src/components/prompt-input/submit.ts` shell branch:

```ts
client.session
  .shell({
    sessionID: session.id,
    agent,
    model,
    variant,
    command: text,
  })
```

Keep the existing error handling and input restore behavior unchanged.

- [ ] **Step 5: Pass variant from the TUI shell branch**

Modify `packages/tui/src/component/prompt/index.tsx` shell branch:

```ts
void sdk.client.session.shell({
  sessionID,
  agent: agent.name,
  model: {
    providerID: selectedModel.providerID,
    modelID: selectedModel.modelID,
  },
  variant,
  command: inputText,
})
```

The `variant` variable already exists before the shell branch. Do not recompute it inside the branch.

- [ ] **Step 6: Run app submit test and confirm it passes**

Run from `packages/app`:

```bash
bun test --preload ./happydom.ts ./src/components/prompt-input/submit.test.ts
```

Expected result after implementation: the submit tests pass.

- [ ] **Step 7: Run app and TUI typechecks**

Run from `packages/app`:

```bash
bun typecheck
```

Run from `packages/tui`:

```bash
bun typecheck
```

Expected result after SDK regeneration and client updates: both typechecks pass.
