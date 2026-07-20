# Task 3: Subagent Data

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/cli/cmd/run/types.ts`
- Modify: `packages/opencode/src/cli/cmd/run/subagent-data.ts`
- Modify: `packages/opencode/test/cli/run/subagent-data.test.ts`

- [ ] **Step 1: Add failing subagent metadata tests**

In `packages/opencode/test/cli/run/subagent-data.test.ts`, add `sameSubagentTab` to the existing import from `@/cli/cmd/run/subagent-data`:

```ts
  sameSubagentTab,
```

Change the `taskMessage` helper signature:

```ts
function taskMessage(
  sessionID: string,
  status: "running" | "completed" | "interrupted" = "completed",
  metadata: Record<string, unknown> = {},
): SessionMessage {
```

In each `taskMessage` metadata object, spread the new metadata after the existing defaults so tests can override or extend task metadata:

```ts
              ...metadata,
```

For the completed branch, the metadata object should become:

```ts
          metadata: {
            sessionId: sessionID,
            toolcalls: 4,
            ...metadata,
          },
```

Add these tests after `bootstraps tabs and child blockers from parent task parts`:

```ts
  test("captures subagent model metadata on tabs", () => {
    const data = createSubagentData()

    bootstrapSubagentData({
      data,
      messages: [
        taskMessage("child-1", "completed", {
          model: {
            providerID: "test",
            modelID: "test-model",
            variant: "xhigh",
          },
        }),
      ],
      children: [{ id: "child-1" }],
      permissions: [],
      questions: [],
    })

    expect(snapshotSubagentData(data).tabs).toEqual([
      expect.objectContaining({
        sessionID: "child-1",
        model: {
          providerID: "test",
          modelID: "test-model",
          variant: "xhigh",
        },
      }),
    ])
  })

  test("omits default subagent variants from tab metadata", () => {
    const data = createSubagentData()

    bootstrapSubagentData({
      data,
      messages: [
        taskMessage("child-1", "completed", {
          model: {
            providerID: "test",
            modelID: "test-model",
            variant: "default",
          },
        }),
      ],
      children: [{ id: "child-1" }],
      permissions: [],
      questions: [],
    })

    expect(snapshotSubagentData(data).tabs).toEqual([
      expect.objectContaining({
        sessionID: "child-1",
        model: {
          providerID: "test",
          modelID: "test-model",
        },
      }),
    ])
  })

  test("compares subagent tab model metadata", () => {
    const base = {
      sessionID: "child-1",
      partID: "part-1",
      callID: "call-1",
      label: "Explore",
      description: "Scan reducer paths",
      status: "running" as const,
      lastUpdatedAt: 1,
    }

    expect(
      sameSubagentTab(
        { ...base, model: { providerID: "test", modelID: "test-model", variant: "xhigh" } },
        { ...base, model: { providerID: "test", modelID: "test-model", variant: "minimal" } },
      ),
    ).toBe(false)
  })
```

- [ ] **Step 2: Run the reducer tests to verify they fail**

Run from `packages/opencode`:

```sh
bun test test/cli/run/subagent-data.test.ts
```

Expected: FAIL because `FooterSubagentTab` does not have model metadata and `taskTab` ignores `metadata.model`.

- [ ] **Step 3: Add model metadata to `FooterSubagentTab`**

In `packages/opencode/src/cli/cmd/run/types.ts`, add this optional field to `FooterSubagentTab` after `title?: string`:

```ts
  model?: {
    providerID: string
    modelID: string
    variant?: string
  }
```

- [ ] **Step 4: Parse task metadata models**

In `packages/opencode/src/cli/cmd/run/subagent-data.ts`, add these helpers near `metadata(...)`:

```ts
function record(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
}

function metadataModel(part: ToolPart): FooterSubagentTab["model"] | undefined {
  const value = record(metadata(part, "model"))
  const providerID = text(value?.providerID)
  const modelID = text(value?.modelID)
  if (!providerID || !modelID) {
    return undefined
  }

  const variant = text(value?.variant)
  return {
    providerID,
    modelID,
    ...(variant && variant !== "default" ? { variant } : {}),
  }
}

function sameModel(a: FooterSubagentTab["model"], b: FooterSubagentTab["model"]) {
  return (
    a?.providerID === b?.providerID &&
    a?.modelID === b?.modelID &&
    a?.variant === b?.variant
  )
}
```

- [ ] **Step 5: Include model in tab creation and comparison**

In `sameSubagentTab`, add model comparison before `lastUpdatedAt`:

```ts
    sameModel(a.model, b.model) &&
```

In `taskTab`, add `model` after `title`:

```ts
    model: metadataModel(part),
```

- [ ] **Step 6: Run reducer tests**

Run from `packages/opencode`:

```sh
bun test test/cli/run/subagent-data.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run task tests to catch metadata shape regressions**

Run from `packages/opencode`:

```sh
bun test test/tool/task.test.ts
```

Expected: PASS.
