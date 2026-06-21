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
    spyOn(prompts, "spinner").mockReturnValue(spinner as unknown as ReturnType<typeof prompts.spinner>)

    await UpgradeCommand.handler({})

    expect(upgrade).toHaveBeenCalledWith("npm", "9.9.9")
    expect(spinner.start).toHaveBeenCalledWith("Upgrading...")
    expect(spinner.stop).toHaveBeenCalledWith("Upgrade complete")
  })
})
