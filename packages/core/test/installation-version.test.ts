import { describe, expect, test } from "bun:test"
import { InstallationLocalUpgradeMessage, isInstallationLocal } from "../src/installation/version"

describe("installation version metadata", () => {
  test("detects local builds by version suffix or channel", () => {
    expect(isInstallationLocal({ version: "local", channel: "latest" })).toBe(true)
    expect(isInstallationLocal({ version: "1.2.3.local", channel: "latest" })).toBe(true)
    expect(isInstallationLocal({ version: "1.2.3", channel: "local" })).toBe(true)
    expect(isInstallationLocal({ version: "1.2.3", channel: "latest" })).toBe(false)
    expect(isInstallationLocal({ version: "1.2.3-local", channel: "latest" })).toBe(false)
  })

  test("explains how local builds must be upgraded", () => {
    expect(InstallationLocalUpgradeMessage).toContain("local build")
    expect(InstallationLocalUpgradeMessage).toContain("Managed auto-update is disabled")
    expect(InstallationLocalUpgradeMessage).toContain("Pull or merge the latest code")
    expect(InstallationLocalUpgradeMessage).toContain("rebuild locally")
  })
})
