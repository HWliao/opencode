import { describe, expect, test } from "bun:test"
import {
  InstallationLocalUpgradeMessage,
  isInstallationLocal,
  normalizeInstallationVersion,
} from "../src/installation/version"

describe("installation version metadata", () => {
  test("detects local builds by version suffix or channel", () => {
    expect(isInstallationLocal({ version: "local", channel: "latest" })).toBe(true)
    expect(isInstallationLocal({ version: "1.2.3.local", channel: "latest" })).toBe(true)
    expect(isInstallationLocal({ version: "1.2.3.local.4", channel: "latest" })).toBe(true)
    expect(isInstallationLocal({ version: "1.2.3", channel: "local" })).toBe(true)
    expect(isInstallationLocal({ version: "1.2.3", channel: "latest" })).toBe(false)
    expect(isInstallationLocal({ version: "1.2.3-local", channel: "latest" })).toBe(false)
  })

  test("normalizes install versions for semver comparisons", () => {
    expect(normalizeInstallationVersion("v1.2.3.local")).toBe("1.2.3")
    expect(normalizeInstallationVersion("v1.2.3.local.4")).toBe("1.2.3")
    expect(normalizeInstallationVersion("1.2.3.local.4")).toBe("1.2.3")
    expect(normalizeInstallationVersion("v1.2.3")).toBe("1.2.3")
    expect(normalizeInstallationVersion("1.2.3")).toBe("1.2.3")
    expect(normalizeInstallationVersion("local")).toBeUndefined()
  })

  test("explains how local builds must be upgraded", () => {
    expect(InstallationLocalUpgradeMessage).toContain("local build")
    expect(InstallationLocalUpgradeMessage).toContain("Managed auto-update is disabled")
    expect(InstallationLocalUpgradeMessage).toContain("Pull or merge the latest code")
    expect(InstallationLocalUpgradeMessage).toContain("rebuild locally")
  })
})
