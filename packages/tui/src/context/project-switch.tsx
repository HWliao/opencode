import { useDialog } from "../ui/dialog"
import { useData } from "./data"
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
  const data = useData()

  return async (directory: string) => {
    const validation = await sdk.client.directory.list({ path: directory })
    if (validation.error) throw validation.error
    sdk.setDirectory(directory)
    project.workspace.set(undefined)
    route.navigate({ type: "home" })
    dialog.clear()
    await sync.bootstrap({ fatal: false })
    await Promise.allSettled([
      data.location.refresh(),
      data.location.agent.refresh(),
      data.location.integration.refresh(),
      data.location.model.refresh(),
      data.location.provider.refresh(),
      data.location.reference.refresh(),
      data.location.command.refresh(),
      data.location.skill.refresh(),
    ])
  }
}
