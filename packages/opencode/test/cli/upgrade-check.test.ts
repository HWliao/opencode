import { InstallationLocalUpgradeMessage } from "@opencode-ai/core/installation/version"
import { describe, expect, mock, test } from "bun:test"
import { upgrade } from "../../src/cli/upgrade"
import { Installation } from "../../src/installation"
import type { GlobalEvent } from "../../src/bus/global"

describe("automatic upgrade check", () => {
  test("local builds check latest before emitting a local-upgrade notice", async () => {
    const events: GlobalEvent[] = []
    const method = mock(async () => "npm" as Installation.Method)
    const latest = mock(async () => "1.2.4")
    const install = mock(async () => {})

    await upgrade({
      currentVersion: "1.2.3.local.4",
      getConfig: async () => ({ autoupdate: true }),
      isLocal: () => true,
      method,
      latest,
      install,
      emit: (_name, event) => {
        events.push(event)
        return true
      },
    })

    expect(method).toHaveBeenCalled()
    expect(latest).toHaveBeenCalledWith("npm")
    expect(install).not.toHaveBeenCalled()
    expect(events).toHaveLength(1)
    expect(events[0].directory).toBe("global")
    expect(events[0].payload.type).toBe("tui.toast.show")
    expect(events[0].payload.properties).toEqual({
      title: "Local build",
      message: InstallationLocalUpgradeMessage,
      variant: "info",
      duration: 10000,
    })
  })

  test("local builds already on latest do not emit a local-upgrade notice", async () => {
    const events: GlobalEvent[] = []
    const install = mock(async () => {})

    await upgrade({
      currentVersion: "1.2.3.local.4",
      getConfig: async () => ({ autoupdate: true }),
      isLocal: () => true,
      method: async () => "npm",
      latest: async () => "1.2.3",
      install,
      emit: (_name, event) => {
        events.push(event)
        return true
      },
    })

    expect(install).not.toHaveBeenCalled()
    expect(events).toHaveLength(0)
  })

  test("local builds without numeric suffix compare as their base version", async () => {
    const events: GlobalEvent[] = []
    const install = mock(async () => {})

    await upgrade({
      currentVersion: "1.17.9.local",
      getConfig: async () => ({ autoupdate: true }),
      isLocal: () => true,
      method: async () => "npm",
      latest: async () => "1.17.9",
      install,
      emit: (_name, event) => {
        events.push(event)
        return true
      },
    })

    expect(install).not.toHaveBeenCalled()
    expect(events).toHaveLength(0)
  })

  test("non-local patch updates still use the managed updater", async () => {
    const events: GlobalEvent[] = []
    const install = mock(async () => {})

    await upgrade({
      currentVersion: "1.2.3",
      getConfig: async () => ({ autoupdate: true }),
      isLocal: () => false,
      method: async () => "npm",
      latest: async () => "1.2.4",
      install,
      emit: (_name, event) => {
        events.push(event)
        return true
      },
    })

    expect(install).toHaveBeenCalledWith("npm", "1.2.4")
    expect(events).toHaveLength(1)
    expect(events[0].payload.type).toBe(Installation.Event.Updated.type)
    expect(events[0].payload.properties).toEqual({ version: "1.2.4" })
  })
})
