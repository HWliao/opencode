import { getDirectory } from "@opencode-ai/core/util/path"
import { InputRenderable, TextAttributes } from "@opentui/core"
import fuzzysort from "fuzzysort"
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useProject } from "../context/project"
import { useProjectSwitch } from "../context/project-switch"
import { useSDK } from "../context/sdk"
import { useTheme } from "../context/theme"
import { useToast } from "../ui/toast"
import { errorMessage } from "../util/error"

export type ProjectDirectoryEntry = { name: string; absolute: string }

export function normalizeProjectInput(input: string) {
  const value = input.replaceAll("\\", "/")
  if (value === "/") return value
  if (/^[A-Za-z]:\/?$/.test(value)) return `${value[0]}:/`
  return value.replace(/\/+$/g, "")
}

export function projectParentDirectory(input: string) {
  const parent = normalizeProjectInput(getDirectory(normalizeProjectInput(input)))
  if (/^[A-Za-z]:$/.test(parent)) return `${parent}/`
  return parent || "/"
}

function hasRoot(input: string) {
  return input.startsWith("/") || input.startsWith("//") || /^[A-Za-z]:\//.test(input)
}

export function joinProjectInput(base: string, input: string) {
  const value = normalizeProjectInput(input.trim())
  const root = normalizeProjectInput(base)
  if (!value) return root
  if (hasRoot(value) && root !== "/" && !/^[A-Za-z]:\/$/.test(root) && value.length === root.length + 1 && value.startsWith(root)) {
    return `${root}/${value.slice(root.length)}`
  }
  if (hasRoot(value)) return value
  if (root === "/") return `${root}${value}`
  return `${root}/${value}`
}

export function filterProjectDirectories(items: ProjectDirectoryEntry[], input: string, browseRoot?: string) {
  const query = directoryFilterQuery(input, browseRoot)
  if (!query) return items
  return fuzzysort.go(query, items, { key: "name" }).map((item) => item.obj)
}

function directoryFilterQuery(input: string, browseRoot?: string) {
  const value = normalizeProjectInput(input)
  if (!browseRoot) return value.split("/").at(-1) ?? ""

  const root = normalizeProjectInput(browseRoot)
  if (value === root) return ""
  if (value.startsWith(`${root}/`)) return value.slice(root.length + 1)
  if (value.startsWith(root)) return value.slice(root.length)
  return value.split("/").at(-1) ?? ""
}

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
  let inputRef: InputRenderable | undefined

  const filtered = createMemo(() => filterProjectDirectories(items(), debouncedInput(), browseRoot()))

  createEffect(() => {
    const next = input()
    const timer = setTimeout(() => setDebouncedInput(next), 10)
    onCleanup(() => clearTimeout(timer))
  })

  createEffect(() => {
    filtered()
    setSelected(0)
  })

  async function load(path: string) {
    const next = normalizeProjectInput(path)
    const response = await sdk.client.directory.list({ path: next })
    if (response.error) throw response.error
    setBrowseRoot(next)
    setInput(next)
    if (inputRef) inputRef.value = next
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
    void load(input()).catch((error) =>
      toast.show({ variant: "error", title: "Failed to list directories", message: errorMessage(error) }),
    )
  })

  return (
    <box gap={1} paddingBottom={1} flexGrow={1}>
      <box paddingLeft={4} paddingRight={4}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Open Project
          </text>
          <text fg={theme.textMuted}>
            esc
          </text>
        </box>
      </box>
      <box paddingX={4} paddingBottom={1} flexDirection="column" gap={1}>
        <input
          focusedBackgroundColor={theme.backgroundPanel}
          cursorColor={theme.primary}
          focusedTextColor={theme.text}
          ref={(element) => {
            inputRef = element
            inputRef.value = input()
            setTimeout(() => {
              if (!inputRef || inputRef.isDestroyed) return
              inputRef.focus()
            }, 1)
          }}
          onInput={(value) => {
            const next = joinProjectInput(browseRoot(), value)
            setInput(next)
            if (inputRef) inputRef.value = next
          }}
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
              <text
                fg={index() === selected() ? theme.primary : theme.text}
                attributes={index() === selected() ? TextAttributes.BOLD : undefined}
              >
                {item.absolute}
              </text>
            )}
          </For>
        </Show>
      </box>
    </box>
  )
}
