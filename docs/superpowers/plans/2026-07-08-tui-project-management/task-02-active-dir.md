# Task 2: Active Dir

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/tui/src/context/sdk.tsx`
- Modify: `packages/tui/src/context/project.tsx`
- Create: `packages/tui/src/context/project-switch.tsx`
- Test: `packages/tui/test/context/project-switch.test.tsx`
- Test support: `packages/tui/test/fixture/tui-sdk.ts`

**Interfaces:**
- Produces: `useSDK().setDirectory(directory: string): void`.
- Produces: `useSDK().directory` as a dynamic getter instead of a fixed startup property.
- Produces: `useProjectSwitch(): (directory: string) => Promise<void>`.
- Consumes: `useSync().bootstrap({ fatal: false })`, `useProject().workspace.set(undefined)`, `useRoute().navigate({ type: "home" })`, and `useDialog().clear()`.

- [ ] **Step 1: Write the failing test**

Create `packages/tui/test/context/project-switch.test.tsx`:

```tsx
/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { onMount } from "solid-js"
import { ArgsProvider } from "../../src/context/args"
import { KVProvider } from "../../src/context/kv"
import { SDKProvider, useSDK } from "../../src/context/sdk"
import { ProjectProvider } from "../../src/context/project"
import { SyncProvider } from "../../src/context/sync"
import { PermissionProvider } from "../../src/context/permission"
import { ExitProvider } from "../../src/context/exit"
import { DialogProvider } from "../../src/ui/dialog"
import { RouteProvider, useRoute } from "../../src/context/route"
import { useProjectSwitch } from "../../src/context/project-switch"
import { TestTuiContexts } from "../fixture/tui-environment"
import { createEventSource, createFetch, directory, json, worktree } from "../fixture/tui-sdk"

test("soft project switch changes sdk directory and returns to home", async () => {
  const target = `${worktree}/packages/app`
  const events = createEventSource()
  const calls: URL[] = []
  const fetch = createFetch((url) => {
    calls.push(url)
    if (url.pathname === "/path") return json({ home: "", state: "", config: "", worktree, directory: url.searchParams.get("directory") ?? directory })
    if (url.pathname === "/project/current") return json({ id: url.searchParams.get("directory") === target ? "proj_app" : "proj_tui", worktree })
  }, events)

  let switchProject!: (directory: string) => Promise<void>
  let sdk!: ReturnType<typeof useSDK>
  let route!: ReturnType<typeof useRoute>
  let ready!: () => void
  const mounted = new Promise<void>((resolve) => (ready = resolve))

  function Probe() {
    sdk = useSDK()
    route = useRoute()
    switchProject = useProjectSwitch()
    onMount(ready)
    return <box />
  }

  const app = await testRender(() => (
    <TestTuiContexts>
      <ArgsProvider>
        <KVProvider>
          <RouteProvider>
            <SDKProvider url="http://test" directory={directory} fetch={fetch.fetch} events={events.source}>
              <PermissionProvider>
                <ProjectProvider>
                  <ExitProvider exit={() => {}}>
                    <SyncProvider>
                      <DialogProvider>
                        <Probe />
                      </DialogProvider>
                    </SyncProvider>
                  </ExitProvider>
                </ProjectProvider>
              </PermissionProvider>
            </SDKProvider>
          </RouteProvider>
        </KVProvider>
      </ArgsProvider>
    </TestTuiContexts>
  ))

  await mounted
  await switchProject(target)

  expect(sdk.directory).toBe(target)
  expect(route.data.type).toBe("home")
  expect(calls.some((url) => url.pathname === "/path" && url.searchParams.get("directory") === target)).toBe(true)
  app.destroy()
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `packages/tui`:

```bash
bun test test/context/project-switch.test.tsx
```

Expected result before implementation: FAIL because `useProjectSwitch` and `setDirectory` do not exist.

- [ ] **Step 3: Make SDK directory dynamic**

Modify `packages/tui/src/context/sdk.tsx` import list:

```ts
import { batch, createSignal, onCleanup, onMount } from "solid-js"
```

Inside `init`, replace the fixed SDK setup with:

```ts
const [directory, setDirectorySignal] = createSignal(props.directory)

function createSDK(nextDirectory = directory()) {
  return createOpencodeClient({
    baseUrl: props.url,
    signal: abort.signal,
    directory: nextDirectory,
    fetch: props.fetch,
    headers: props.headers,
  })
}

let sdk = createSDK()

function setDirectory(next: string) {
  if (directory() === next) return
  setDirectorySignal(next)
  sdk = createSDK(next)
  if (!props.events) startSSE()
}
```

Return dynamic accessors:

```ts
return {
  get client() {
    return sdk
  },
  get directory() {
    return directory()
  },
  setDirectory,
  event: emitter,
  fetch: props.fetch ?? fetch,
  url: props.url,
}
```

- [ ] **Step 4: Make project default path use the dynamic SDK directory**

In `packages/tui/src/context/project.tsx`, change the fixed `defaultPath` object to a function:

```ts
const defaultPath = () =>
  ({
    home: "",
    state: "",
    config: "",
    worktree: "",
    directory: sdk.directory ?? "",
  }) satisfies Path
```

Use `defaultPath()` in the initial store and in `project.sync()` fallback:

```ts
instance: {
  path: defaultPath(),
}
```

```ts
setStore("instance", "path", reconcile(instancePath.data || defaultPath()))
```

- [ ] **Step 5: Add the soft switch helper**

Create `packages/tui/src/context/project-switch.tsx`:

```tsx
import { useDialog } from "../ui/dialog"
import { useProject } from "./project"
import { useRoute } from "./route"
import { useSDK } from "./sdk"
import { useSync } from "./sync"

export function useProjectSwitch() {
  const sdk = useSDK()
  const project = useProject()
  const route = useRoute()
  const sync = useSync()
  const dialog = useDialog()

  return async (directory: string) => {
    sdk.setDirectory(directory)
    project.workspace.set(undefined)
    route.navigate({ type: "home" })
    dialog.clear()
    await sync.bootstrap({ fatal: false })
  }
}
```

- [ ] **Step 6: Update the SDK fixture for generated query routing**

Modify `packages/tui/test/fixture/tui-sdk.ts` so default `/path` and `/project/current` responses use `url.searchParams.get("directory") ?? directory`. This lets tests observe the dynamic default directory in generated SDK requests.

- [ ] **Step 7: Run focused and package validation**

Run from `packages/tui`:

```bash
bun test test/context/project-switch.test.tsx
bun typecheck
```

Expected result: both commands pass.

- [ ] **Step 8: Leave git uncommitted**

Do not commit. Record changed files in the task result and update this task's row in `index.md` only if the user asks you to mark task state.
