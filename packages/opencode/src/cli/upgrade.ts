import { Config } from "@/config/config"
import { AppRuntime } from "@/effect/app-runtime"
import { Installation } from "@/installation"
import { Flag } from "@opencode-ai/core/flag/flag"
import { GlobalBus, type GlobalEvent } from "@/bus/global"
import { TuiEvent } from "@/server/tui-event"
import { InstallationLocalUpgradeMessage, InstallationVersion } from "@opencode-ai/core/installation/version"

type UpgradeCheckInput = {
  currentVersion?: string
  getConfig?: () => Promise<{ autoupdate?: boolean | "notify" }>
  isLocal?: () => boolean
  method?: () => Promise<Installation.Method>
  latest?: (method?: Installation.Method) => Promise<string>
  install?: (method: Installation.Method, target: string) => Promise<void>
  emit?: (eventName: "event", event: GlobalEvent) => boolean
}

export async function upgrade(input: UpgradeCheckInput = {}) {
  const config = await (input.getConfig ?? (() => AppRuntime.runPromise(Config.Service.use((cfg) => cfg.getGlobal()))))()
  if (config.autoupdate === false || Flag.OPENCODE_DISABLE_AUTOUPDATE) return

  const emit = input.emit ?? ((eventName: "event", event: GlobalEvent) => GlobalBus.emit(eventName, event))
  if ((input.isLocal ?? Installation.isLocal)()) {
    emit("event", {
      directory: "global",
      payload: {
        type: TuiEvent.ToastShow.type,
        properties: {
          title: "Local build",
          message: InstallationLocalUpgradeMessage,
          variant: "info",
          duration: 10000,
        },
      },
    })
    return
  }

  const method = await (input.method ?? Installation.method)()
  const latest = await (input.latest ?? Installation.latest)(method).catch(() => {})
  if (!latest) return

  if (Flag.OPENCODE_ALWAYS_NOTIFY_UPDATE) {
    emit("event", {
      directory: "global",
      payload: {
        type: Installation.Event.UpdateAvailable.type,
        properties: { version: latest },
      },
    })
    return
  }

  const currentVersion = input.currentVersion ?? InstallationVersion
  if (currentVersion === latest) return

  const kind = Installation.getReleaseType(currentVersion, latest)

  if (config.autoupdate === "notify" || kind !== "patch") {
    emit("event", {
      directory: "global",
      payload: {
        type: Installation.Event.UpdateAvailable.type,
        properties: { version: latest },
      },
    })
    return
  }

  if (method === "unknown") return
  await (input.install ?? Installation.upgrade)(method, latest)
    .then(() =>
      emit("event", {
        directory: "global",
        payload: {
          type: Installation.Event.Updated.type,
          properties: { version: latest },
        },
      }),
    )
    .catch(() => {})
}
