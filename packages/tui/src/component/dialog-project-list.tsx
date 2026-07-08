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
type ProjectOption<T extends ProjectListItem = ProjectListItem> = { project: T; current: boolean }

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
      value: { project: item, current: item.id === currentProjectID },
      search: projectSearchText(item),
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
