# Task 4: Add Project

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Create: `packages/tui/src/component/dialog-project-add.tsx`
- Modify: `packages/tui/src/component/dialog-project-list.tsx`
- Modify: `packages/tui/src/app.tsx`
- Modify: `packages/tui/test/fixture/tui-sdk.ts`
- Test: `packages/tui/test/component/dialog-project-add.test.ts`

**Interfaces:**
- Consumes: generated `sdk.client.directory.list({ path: string })` from Task 1.
- Consumes: `useProjectSwitch(): (directory: string) => Promise<void>` from Task 2.
- Consumes: `DialogProjectList(props: { onOpenProject?: () => void })` from Task 3.
- Produces: `DialogProjectAdd(props: { onBack: () => void })`.
- Produces: pure helpers `projectParentDirectory`, `joinProjectInput`, `filterProjectDirectories`, and `normalizeProjectInput` exported from `dialog-project-add.tsx`.

- [ ] **Step 1: Write pure interaction tests**

Create `packages/tui/test/component/dialog-project-add.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import {
  filterProjectDirectories,
  joinProjectInput,
  normalizeProjectInput,
  projectParentDirectory,
} from "../../src/component/dialog-project-add"

describe("dialog project add", () => {
  test("starts from the current project parent directory", () => {
    expect(projectParentDirectory("D:/develop/opencode/lucky-cactus")).toBe("D:/develop/opencode")
    expect(projectParentDirectory("/home/leo/opencode/lucky-cactus")).toBe("/home/leo/opencode")
  })

  test("typing appends to the current directory input", () => {
    expect(joinProjectInput("D:/develop/opencode", "A")).toBe("D:/develop/opencode/A")
    expect(joinProjectInput("D:/develop/opencode", "D:/other/repo")).toBe("D:/other/repo")
    expect(joinProjectInput("D:/develop/opencode", "D:\\other\\repo")).toBe("D:/other/repo")
  })

  test("filters direct child directories with fuzzy matching", () => {
    const items = [
      { name: "subA", absolute: "D:/develop/opencode/subA" },
      { name: "subB", absolute: "D:/develop/opencode/subB" },
    ]
    expect(filterProjectDirectories(items, "D:/develop/opencode/A").map((item) => item.absolute)).toEqual([
      "D:/develop/opencode/subA",
    ])
  })

  test("normalizes windows separators for display and comparison", () => {
    expect(normalizeProjectInput("D:\\develop\\opencode\\")).toBe("D:/develop/opencode")
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `packages/tui`:

```bash
bun test test/component/dialog-project-add.test.ts
```

Expected result before implementation: FAIL because `dialog-project-add` does not exist.

- [ ] **Step 3: Implement path and filter helpers**

Create `packages/tui/src/component/dialog-project-add.tsx` and start with these exports:

```tsx
import fuzzysort from "fuzzysort"
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { getDirectory } from "@opencode-ai/core/util/path"
import { TextAttributes } from "@opentui/core"
import { useProject } from "../context/project"
import { useProjectSwitch } from "../context/project-switch"
import { useSDK } from "../context/sdk"
import { useTheme } from "../context/theme"
import { Dialog } from "../ui/dialog"
import { useToast } from "../ui/toast"
import { errorMessage } from "../util/error"

export type ProjectDirectoryEntry = { name: string; absolute: string }

export function normalizeProjectInput(input: string) {
  const value = input.replaceAll("\\", "/")
  if (/^[A-Za-z]:\/$/.test(value)) return value
  return value.replace(/\/+$/g, "")
}

export function projectParentDirectory(input: string) {
  return normalizeProjectInput(getDirectory(normalizeProjectInput(input))).replace(/\/+$/g, "")
}

function hasRoot(input: string) {
  return input.startsWith("/") || input.startsWith("//") || /^[A-Za-z]:\//.test(input)
}

export function joinProjectInput(base: string, input: string) {
  const value = normalizeProjectInput(input.trim())
  if (!value) return normalizeProjectInput(base)
  if (hasRoot(value)) return value
  return `${normalizeProjectInput(base)}/${value}`
}

export function filterProjectDirectories(items: ProjectDirectoryEntry[], input: string) {
  const query = normalizeProjectInput(input).split("/").at(-1) ?? ""
  if (!query) return items
  return fuzzysort.go(query, items, { key: "name" }).map((item) => item.obj)
}
```

- [ ] **Step 4: Implement the custom add-project dialog**

Continue `packages/tui/src/component/dialog-project-add.tsx` with a custom input and selector. Use custom UI instead of `DialogSelect` because `space` must copy the selected item into the input and `enter` must confirm the input value.

```tsx
export function DialogProjectAdd(props: { onBack: () => void }) {
  const sdk = useSDK()
  const project = useProject()
  const switchProject = useProjectSwitch()
  const toast = useToast()
  const { theme } = useTheme()
  const [input, setInput] = createSignal(projectParentDirectory(project.instance.directory() || sdk.directory || ""))
  const [browseRoot, setBrowseRoot] = createSignal(input())
  const [items, setItems] = createSignal<ProjectDirectoryEntry[]>([])
  const [selected, setSelected] = createSignal(0)
  const [debouncedInput, setDebouncedInput] = createSignal(input())

  const filtered = createMemo(() => filterProjectDirectories(items(), debouncedInput()))

  createEffect(() => {
    const next = input()
    const timer = setTimeout(() => setDebouncedInput(next), 10)
    onCleanup(() => clearTimeout(timer))
  })

  createEffect(() => {
    setSelected(0)
  })

  async function load(path: string) {
    const next = normalizeProjectInput(path)
    const response = await sdk.client.directory.list({ path: next })
    setBrowseRoot(next)
    setInput(next)
    setItems(response.data ?? [])
    setSelected(0)
  }

  function move(delta: number) {
    const count = filtered().length
    if (count === 0) return
    setSelected((index) => (index + delta + count) % count)
  }

  async function chooseSelected() {
    const item = filtered()[selected()]
    if (!item) return
    await load(item.absolute)
  }

  async function confirm() {
    await switchProject(normalizeProjectInput(input()))
  }

  onMount(() => {
    void load(input()).catch((error) => toast.show({ variant: "error", title: "Failed to list directories", message: errorMessage(error) }))
  })

  return (
    <Dialog title="Open Project">
      <box paddingX={4} paddingBottom={1} flexDirection="column" gap={1}>
        <input
          focusedBackgroundColor={theme.backgroundPanel}
          cursorColor={theme.primary}
          focusedTextColor={theme.text}
          defaultValue={input()}
          onInput={(value) => setInput(joinProjectInput(browseRoot(), value))}
          onKeyDown={(event) => {
            if (event.name === "escape") props.onBack()
            if (event.name === "up") move(-1)
            if (event.name === "down") move(1)
            if (event.name === "space") void chooseSelected().catch(toast.error)
            if (event.name === "return") void confirm().catch(toast.error)
          }}
        />
        <Show when={filtered().length} fallback={<text fg={theme.textMuted}>No directories found</text>}>
          <For each={filtered()}>
            {(item, index) => (
              <text fg={index() === selected() ? theme.primary : theme.text} attributes={index() === selected() ? TextAttributes.BOLD : undefined}>
                {item.absolute}
              </text>
            )}
          </For>
        </Show>
      </box>
    </Dialog>
  )
}
```

If OpenTUI input key event names differ in the current API, adapt the names to the existing input event shape in `packages/tui/src/ui/dialog-select.tsx` while preserving the exact behavior above.

- [ ] **Step 5: Wire project list to add-project and back**

Modify `packages/tui/src/app.tsx` import:

```ts
import { DialogProjectAdd } from "./component/dialog-project-add"
```

In the `project.list` command, use local functions so add-project can return to project list:

```tsx
run: () => {
  const openList = () => dialog.replace(() => <DialogProjectList onOpenProject={openAdd} />)
  const openAdd = () => dialog.replace(() => <DialogProjectAdd onBack={openList} />)
  openList()
},
```

- [ ] **Step 6: Update SDK fixture for directory API**

Modify `packages/tui/test/fixture/tui-sdk.ts` so `/directory` returns direct children for test paths:

```ts
if (url.pathname === "/directory") {
  const target = url.searchParams.get("path") ?? directory
  return json([
    { name: "subA", absolute: `${target}/subA` },
    { name: "subB", absolute: `${target}/subB` },
  ])
}
```

- [ ] **Step 7: Run focused and package validation**

Run from `packages/tui`:

```bash
bun test test/component/dialog-project-add.test.ts test/component/dialog-project-list.test.ts
bun typecheck
```

Expected result: both commands pass.

- [ ] **Step 8: Leave git uncommitted**

Do not commit. Record changed files in the task result and update this task's row in `index.md` only if the user asks you to mark task state.
