# Task 3: CLI Upgrade

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/cli/cmd/upgrade.ts:1-74`
- Create: `packages/opencode/test/cli/upgrade-command.test.ts`

- [ ] **Step 1: Write the failing CLI command tests**

Create `packages/opencode/test/cli/upgrade-command.test.ts`:

```ts
import { InstallationLocalUpgradeMessage } from "@opencode-ai/core/installation/version"
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import * as prompts from "@clack/prompts"
import { UpgradeCommand } from "../../src/cli/cmd/upgrade"
import { UI } from "../../src/cli/ui"
import { Installation } from "../../src/installation"

afterEach(() => {
  mock.restore()
})

function quietPromptUi() {
  spyOn(UI, "empty").mockImplementation(() => {})
  spyOn(UI, "println").mockImplementation(() => {})
  spyOn(prompts, "intro").mockImplementation(() => {})
  spyOn(prompts, "outro").mockImplementation(() => {})
  spyOn(prompts.log, "info").mockImplementation(() => {})
  spyOn(prompts.log, "warn").mockImplementation(() => {})
  spyOn(prompts.log, "error").mockImplementation(() => {})
}

describe("upgrade command", () => {
  test("local builds skip before detecting or running a managed upgrade", async () => {
    quietPromptUi()
    const isLocal = spyOn(Installation, "isLocal").mockReturnValue(true)
    const method = spyOn(Installation, "method").mockResolvedValue("npm")
    const latest = spyOn(Installation, "latest").mockResolvedValue("9.9.9")
    const upgrade = spyOn(Installation, "upgrade").mockResolvedValue()

    await UpgradeCommand.handler({})

    expect(isLocal).toHaveBeenCalled()
    expect(method).not.toHaveBeenCalled()
    expect(latest).not.toHaveBeenCalled()
    expect(upgrade).not.toHaveBeenCalled()
    expect(prompts.log.warn).toHaveBeenCalledWith(InstallationLocalUpgradeMessage)
  })

  test("non-local builds still run the managed upgrade", async () => {
    quietPromptUi()
    spyOn(Installation, "isLocal").mockReturnValue(false)
    spyOn(Installation, "method").mockResolvedValue("npm")
    spyOn(Installation, "latest").mockResolvedValue("9.9.9")
    const upgrade = spyOn(Installation, "upgrade").mockResolvedValue()
    const spinner = { start: mock(() => {}), stop: mock(() => {}) }
    spyOn(prompts, "spinner").mockReturnValue(spinner as ReturnType<typeof prompts.spinner>)

    await UpgradeCommand.handler({})

    expect(upgrade).toHaveBeenCalledWith("npm", "9.9.9")
    expect(spinner.start).toHaveBeenCalledWith("Upgrading...")
    expect(spinner.stop).toHaveBeenCalledWith("Upgrade complete")
  })
})
```

- [ ] **Step 2: Run the CLI command tests to verify they fail**

Run from `packages/opencode`:

```bash
bun test test/cli/upgrade-command.test.ts
```

Expected: FAIL because the local-build guard is not present.

- [ ] **Step 3: Add the manual upgrade guard**

In `packages/opencode/src/cli/cmd/upgrade.ts`, change the imports from:

```ts
import { InstallationVersion } from "@opencode-ai/core/installation/version"
```

to:

```ts
import { InstallationLocalUpgradeMessage, InstallationVersion } from "@opencode-ai/core/installation/version"
```

Then add this block immediately after `prompts.intro("Upgrade")`:

```ts
    if (Installation.isLocal()) {
      prompts.log.warn(InstallationLocalUpgradeMessage)
      prompts.outro("Done")
      return
    }
```

The beginning of the handler should read:

```ts
  handler: async (args: { target?: string; method?: string }) => {
    UI.empty()
    UI.println(UI.logo("  "))
    UI.empty()
    prompts.intro("Upgrade")
    if (Installation.isLocal()) {
      prompts.log.warn(InstallationLocalUpgradeMessage)
      prompts.outro("Done")
      return
    }
    const detectedMethod = await Installation.method()
```

- [ ] **Step 4: Run the CLI command tests to verify they pass**

Run from `packages/opencode`:

```bash
bun test test/cli/upgrade-command.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/opencode/src/cli/cmd/upgrade.ts packages/opencode/test/cli/upgrade-command.test.ts
git commit -m "fix(opencode): refuse local cli upgrades"
```
