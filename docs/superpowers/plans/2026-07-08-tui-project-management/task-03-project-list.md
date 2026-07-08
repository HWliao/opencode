# Task 3: Project List

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Create: `packages/tui/src/component/dialog-project-list.tsx`
- Modify: `packages/tui/src/app.tsx`
- Modify: `packages/tui/src/config/keybind.ts`
- Modify: `packages/tui/test/fixture/tui-sdk.ts`
- Test: `packages/tui/test/component/dialog-project-list.test.ts`

**Interfaces:**
- Consumes: `useProjectSwitch(): (directory: string) => Promise<void>` from Task 2.
- Consumes: `sdk.client.project.list()` generated/existing SDK method.
- Produces: TUI command `project.list` with slash name `projects`.
- Produces: dialog action command `dialog.project.open` bound to `ctrl+o`.
- Produces: `DialogProjectList(props?: { onOpenProject?: () => void })`.

- [ ] **Step 1: Write pure behavior tests**

Create `packages/tui/test/component/dialog-project-list.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import { createProjectListOptions, projectDisplayName, projectSearchText } from "../../src/component/dialog-project-list"

describe("dialog project list", () => {
  test("uses project name before worktree basename", () => {
    expect(projectDisplayName({ name: "Named", worktree: "D:/repo/actual" })).toBe("Named")
    expect(projectDisplayName({ worktree: "D:/repo/actual" })).toBe("actual")
    expect(projectDisplayName({ worktree: "/home/leo/opencode/" })).toBe("opencode")
  })

  test("search text includes display name and directory", () => {
    expect(projectSearchText({ name: "Named", worktree: "D:/repo/actual" })).toBe("Named\nD:/repo/actual")
  })

  test("options include directory detail and current marker", () => {
    const options = createProjectListOptions([
      { id: "proj_a", name: "A", worktree: "/repo/a" },
      { id: "proj_b", worktree: "/repo/b" },
    ], "proj_a")

    expect(options.map((option) => option.title)).toEqual(["A", "b"])
    expect(options[0]?.details).toEqual(["/repo/a"])
    expect(options[0]?.value.project.id).toBe("proj_a")
    expect(options[0]?.value.current).toBe(true)
    expect(options[1]?.value.current).toBe(false)
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `packages/tui`:

```bash
bun test test/component/dialog-project-list.test.ts
```

Expected result before implementation: FAIL because `dialog-project-list` does not exist.

- [ ] **Step 3: Add keybind definitions**

Modify `packages/tui/src/config/keybind.ts` definitions:

```ts
project_list: keybind("none", "Switch project"),
"dialog.project.open": keybind("ctrl+o", "Open project directory"),
```

Add to `CommandMap`:

```ts
project_list: "project.list",
```

- [ ] **Step 4: Implement the project list component**

Create `packages/tui/src/component/dialog-project-list.tsx`:

```tsx
import { getFilename } from "@opencode-ai/core/util/path"
import type { Project } from "@opencode-ai/sdk/v2"
import { createMemo, createSignal, onMount } from "solid-js"
import { useProject } from "../context/project"
import { useProjectSwitch } from "../context/project-switch"
import { useSDK } from "../context/sdk"
import { DialogSelect, type DialogSelectOption } from "../ui/dialog-select"
import { useToast } from "../ui/toast"
import { errorMessage } from "../util/error"

export type ProjectListItem = Pick<Project, "id" | "name" | "worktree">
type ProjectOption<T extends ProjectListItem = ProjectListItem> = { project: T; current: boolean; search: string }

export function projectDisplayName(project: Pick<ProjectListItem, "name" | "worktree">) {
  return project.name || getFilename(project.worktree)
}

export function projectSearchText(project: Pick<ProjectListItem, "name" | "worktree">) {
  return `${projectDisplayName(project)}\n${project.worktree}`
}

export function createProjectListOptions<T extends ProjectListItem>(
  projects: T[],
  currentProjectID?: string,
): DialogSelectOption<ProjectOption<T>>[] {
  return projects
    .toSorted((a, b) => projectDisplayName(a).localeCompare(projectDisplayName(b)))
    .map((item) => ({
      title: projectDisplayName(item),
      value: { project: item, current: item.id === currentProjectID, search: projectSearchText(item) },
      details: [item.worktree],
      footer: item.id === currentProjectID ? "current" : undefined,
    }))
}

export function DialogProjectList(props: { onOpenProject?: () => void } = {}) {
  const sdk = useSDK()
  const project = useProject()
  const switchProject = useProjectSwitch()
  const toast = useToast()
  const [projects, setProjects] = createSignal<Project[]>([])

  const options = createMemo(() => createProjectListOptions(projects(), project.project()))

  onMount(() => {
    void sdk.client.project
      .list()
      .then((response) => setProjects(response.data ?? []))
      .catch((error) => toast.show({ variant: "error", title: "Failed to load projects", message: errorMessage(error) }))
  })

  return (
    <DialogSelect
      title="Projects"
      placeholder="Search projects"
      options={options()}
      onSelect={(option) => void switchProject(option.value.project.worktree).catch(toast.error)}
      actions={[{ command: "dialog.project.open", title: "open", onTrigger: () => props.onOpenProject?.() }]}
    />
  )
}
```

- [ ] **Step 5: Register `/projects` in the app command list**

Modify `packages/tui/src/app.tsx` imports:

```ts
import { DialogProjectList } from "./component/dialog-project-list"
```

Add `"project.list"` to `appBindingCommands`.

Add a command to `appCommands` near existing session/workspace commands:

```ts
{
  name: "project.list",
  title: "Switch project",
  category: "Project",
  slashName: "projects",
  run: () => {
    dialog.replace(() => <DialogProjectList />)
  },
}
```

- [ ] **Step 6: Update TUI SDK fixture project list response**

Modify `packages/tui/test/fixture/tui-sdk.ts` so `/project` returns at least the current project when no override handles it:

```ts
if (url.pathname === "/project")
  return json([{ id: "proj_test", worktree, name: "opencode", time: { created: 0, updated: 0 }, sandboxes: [] }])
```

- [ ] **Step 7: Run focused and package validation**

Run from `packages/tui`:

```bash
bun test test/component/dialog-project-list.test.ts
bun typecheck
```

Expected result: both commands pass.

- [ ] **Step 8: Leave git uncommitted**

Do not commit. Record changed files in the task result and update this task's row in `index.md` only if the user asks you to mark task state.
