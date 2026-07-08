/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui"
import { testRender, useRenderer } from "@opentui/solid"
import { mkdir } from "node:fs/promises"
import { onCleanup, onMount } from "solid-js"
import { ArgsProvider } from "../../src/context/args"
import { ClipboardProvider } from "../../src/context/clipboard"
import { KVProvider } from "../../src/context/kv"
import { SDKProvider, useSDK } from "../../src/context/sdk"
import { DataProvider, useData } from "../../src/context/data"
import { ProjectProvider, useProject } from "../../src/context/project"
import { SyncProvider } from "../../src/context/sync"
import { PermissionProvider } from "../../src/context/permission"
import { ExitProvider } from "../../src/context/exit"
import { DialogProvider, useDialog } from "../../src/ui/dialog"
import { ToastProvider } from "../../src/ui/toast"
import { RouteProvider, useRoute } from "../../src/context/route"
import { useProjectSwitch } from "../../src/context/project-switch"
import { OpencodeKeymapProvider, registerOpencodeKeymap } from "../../src/keymap"
import { TestTuiContexts } from "../fixture/tui-environment"
import { createTuiResolvedConfig } from "../fixture/tui-runtime"
import { createEventSource, createFetch, directory, json, worktree } from "../fixture/tui-sdk"

test("soft project switch changes sdk directory and returns to home", async () => {
  const target = `${worktree}/packages/app`
  await mkdir(`${worktree}/state`, { recursive: true })
  await Bun.write(`${worktree}/state/kv.json`, "{}")
  const events = createEventSource()
  const calls: URL[] = []
  const fetch = createFetch((url) => {
    calls.push(url)
    if (url.pathname === "/path") return json({ home: "", state: "", config: "", worktree, directory: url.searchParams.get("directory") ?? directory })
    if (url.pathname === "/api/location") {
      const next = url.searchParams.get("directory") ?? directory
      return json({ directory: next, project: { id: next === target ? "proj_app" : "proj_tui", directory: next } })
    }
    if (url.pathname === "/api/reference") {
      const next = url.searchParams.get("directory") ?? directory
      return json({ location: { directory: next, project: { id: next === target ? "proj_app" : "proj_tui", directory: next } }, data: [{ type: "file", path: next }] })
    }
    if (url.pathname === "/project/current") return json({ id: url.searchParams.get("directory") === target ? "proj_app" : "proj_tui", worktree })
  }, events)

  let switchProject!: (directory: string) => Promise<void>
  let sdk!: ReturnType<typeof useSDK>
  let data!: ReturnType<typeof useData>
  let route!: ReturnType<typeof useRoute>
  let ready!: () => void
  const mounted = new Promise<void>((resolve) => (ready = resolve))

  function Probe() {
    sdk = useSDK()
    data = useData()
    route = useRoute()
    switchProject = useProjectSwitch()
    onMount(ready)
    return <box />
  }

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    const off = registerOpencodeKeymap(keymap, renderer, createTuiResolvedConfig())
    onCleanup(off)

    return (
      <OpencodeKeymapProvider keymap={keymap}>
        <TestTuiContexts>
          <ArgsProvider>
            <KVProvider>
              <RouteProvider>
                <SDKProvider url="http://test" directory={directory} fetch={fetch.fetch} events={events.source}>
                  <PermissionProvider>
                    <ProjectProvider>
                      <ExitProvider exit={() => {}}>
                        <SyncProvider>
                          <DataProvider>
                            <ToastProvider>
                              <ClipboardProvider value={{}}>
                                <DialogProvider>
                                  <Probe />
                                </DialogProvider>
                              </ClipboardProvider>
                            </ToastProvider>
                          </DataProvider>
                        </SyncProvider>
                      </ExitProvider>
                    </ProjectProvider>
                  </PermissionProvider>
                </SDKProvider>
              </RouteProvider>
            </KVProvider>
          </ArgsProvider>
        </TestTuiContexts>
      </OpencodeKeymapProvider>
    )
  }

  const app = await testRender(() => <Harness />)

  await mounted
  await switchProject(target)

  expect(sdk.directory).toBe(target)
  expect(route.data.type).toBe("home")
  expect(calls.some((url) => url.pathname === "/path" && url.searchParams.get("directory") === target)).toBe(true)
  expect(calls.some((url) => url.pathname === "/api/reference" && url.searchParams.get("directory") === target)).toBe(true)
  expect(data.location.default().directory).toBe(target)
  expect(data.location.reference.list()?.map((item) => item.path)).toEqual([target])
  app.renderer.destroy()
})

test("invalid project switch validates before mutating tui state", async () => {
  const target = `${worktree}/deleted`
  await mkdir(`${worktree}/state`, { recursive: true })
  await Bun.write(`${worktree}/state/kv.json`, "{}")
  const events = createEventSource()
  const calls: URL[] = []
  const fetch = createFetch((url) => {
    calls.push(url)
    if (url.pathname === "/directory" && url.searchParams.get("path") === target) return json({}, { status: 400 })
  }, events)

  let switchProject!: (directory: string) => Promise<void>
  let sdk!: ReturnType<typeof useSDK>
  let project!: ReturnType<typeof useProject>
  let route!: ReturnType<typeof useRoute>
  let dialogClearCalls = 0
  let ready!: () => void
  const mounted = new Promise<void>((resolve) => (ready = resolve))

  function Probe() {
    sdk = useSDK()
    project = useProject()
    route = useRoute()
    const dialog = useDialog()
    const clear = dialog.clear
    dialog.clear = () => {
      dialogClearCalls++
      clear()
    }
    switchProject = useProjectSwitch()
    onMount(() => {
      project.workspace.set("workspace-test")
      ready()
    })
    return <box />
  }

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    const off = registerOpencodeKeymap(keymap, renderer, createTuiResolvedConfig())
    onCleanup(off)

    return (
      <OpencodeKeymapProvider keymap={keymap}>
        <TestTuiContexts>
          <ArgsProvider>
            <KVProvider>
              <RouteProvider initialRoute={{ type: "session", sessionID: "session-test" }}>
                <SDKProvider url="http://test" directory={directory} fetch={fetch.fetch} events={events.source}>
                  <PermissionProvider>
                    <ProjectProvider>
                      <ExitProvider exit={() => {}}>
                        <SyncProvider>
                          <DataProvider>
                            <ToastProvider>
                              <ClipboardProvider value={{}}>
                                <DialogProvider>
                                  <Probe />
                                </DialogProvider>
                              </ClipboardProvider>
                            </ToastProvider>
                          </DataProvider>
                        </SyncProvider>
                      </ExitProvider>
                    </ProjectProvider>
                  </PermissionProvider>
                </SDKProvider>
              </RouteProvider>
            </KVProvider>
          </ArgsProvider>
        </TestTuiContexts>
      </OpencodeKeymapProvider>
    )
  }

  const app = await testRender(() => <Harness />)

  await mounted
  let rejected = false
  try {
    await switchProject(target)
  } catch {
    rejected = true
  }

  expect(rejected).toBe(true)
  expect(calls.some((url) => url.pathname === "/directory" && url.searchParams.get("path") === target)).toBe(true)
  expect(sdk.directory).toBe(directory)
  expect(route.data).toEqual({ type: "session", sessionID: "session-test" })
  expect(project.workspace.current()).toBe("workspace-test")
  expect(dialogClearCalls).toBe(0)
  expect(calls.some((url) => url.pathname === "/path" && url.searchParams.get("directory") === target)).toBe(false)
  app.renderer.destroy()
})
