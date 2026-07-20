# Task 4: Footer Display

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/cli/cmd/run/footer.view.tsx`

- [ ] **Step 1: Confirm the existing model renderer stays in place**

In `packages/opencode/src/cli/cmd/run/footer.view.tsx`, keep the existing status-line renderer unchanged:

```tsx
                <Show when={responsive().statusline.showModel && modelStatus()}>
                  {(info) => (
                    <box paddingRight={1} backgroundColor="transparent" flexShrink={0}>
                      <text fg={theme().text} wrapMode="none">
                        {info().model}
                        <Show when={info().provider}>
                          {(provider) => <span style={{ fg: theme().muted }}> {provider()}</span>}
                        </Show>
                        <Show when={info().variant}>
                          {(variant) => (
                            <>
                              <span style={{ fg: theme().warning, bold: true }}> {variant()}</span>
                            </>
                          )}
                        </Show>
                      </text>
                    </box>
                  )}
                </Show>
```

Do not add model text to `RunFooterSubagentBody`, the subagent list, or the subagent header.

- [ ] **Step 2: Route selected subagent model data into `modelStatus()`**

In `RunFooterView`, add this memo after `selectedTab`:

```ts
  const selectedModel = createMemo(() => selectedTab()?.model)
```

Replace `modelStatus` with this version:

```ts
  const modelStatus = createMemo(() => {
    const child = selectedModel()
    if (child) {
      return {
        model: modelInfo(props.providers(), child).model,
        variant: child.variant === "default" ? undefined : child.variant,
        provider: undefined,
      }
    }

    const current = props.currentModel()
    if (!prompt() || shell() || !current) {
      return
    }

    return {
      model: model().model,
      variant: props.currentVariant(),
      provider: undefined,
      // Prefer without provider, but keep it on the shared width policy if we add it back.
    }
  })
```

This preserves the main-session display when no subagent is selected and reuses the existing variant styling when a selected subagent has a non-default variant.

- [ ] **Step 3: Run focused tests**

Run from `packages/opencode`:

```sh
bun test test/cli/run/subagent-data.test.ts
```

Expected: PASS. The reducer tests prove the footer receives normalized subagent model metadata.

- [ ] **Step 4: Run typecheck**

Run from `packages/opencode`:

```sh
bun typecheck
```

Expected: PASS. This catches type mismatches between `FooterSubagentTab.model`, `modelInfo`, and `modelStatus()`.
