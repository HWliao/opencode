# Task 2: Auto Check

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/cli/upgrade.ts:1-53`
- Create: `packages/opencode/test/cli/upgrade-check.test.ts`

- [ ] **Step 1: Write the failing automatic update tests**

Create `packages/opencode/test/cli/upgrade-check.test.ts`:

```ts
import { InstallationLocalUpgradeMessage } from "@opencode-ai/core/installation/version"
import { describe, expect, mock, test } from "bun:test"
import { upgrade } from "../../src/cli/upgrade"
import { Installation } from "../../src/installation"
import type { GlobalEvent } from "../../src/bus/global"

describe("automatic upgrade check", () => {
  test("local builds emit a local-upgrade notice without checking latest or installing", async () => {
    const events: GlobalEvent[] = []
    const method = mock(async () => "npm" as Installation.Method)
    const latest = mock(async () => "9.9.9")
    const install = mock(async () => {})

    await upgrade({
      currentVersion: "1.2.3.local",
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

    expect(method).not.toHaveBeenCalled()
    expect(latest).not.toHaveBeenCalled()
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
```

- [ ] **Step 2: Run the new automatic update tests to verify they fail**

Run from `packages/opencode`:

```bash
bun test test/cli/upgrade-check.test.ts
```

Expected: FAIL because `upgrade()` does not accept injected dependencies and does not emit a local-build toast.

- [ ] **Step 3: Add the local guard and dependency seam in `upgrade()`**

In `packages/opencode/src/cli/upgrade.ts`, keep the existing behavior but replace the file with this shape:

```ts
import { Config } from "@/config/config"
import { AppRuntime } from "@/effect/app-runtime"
import { Installation } from "@/installation"
import { Flag } from "@/flag/flag"
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
```

- [ ] **Step 4: Run the automatic update tests to verify they pass**

Run from `packages/opencode`:

```bash
bun test test/cli/upgrade-check.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/opencode/src/cli/upgrade.ts packages/opencode/test/cli/upgrade-check.test.ts
git commit -m "fix(opencode): skip auto updates for local builds"
```
