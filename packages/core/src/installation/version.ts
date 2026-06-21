declare global {
  const OPENCODE_VERSION: string
  const OPENCODE_CHANNEL: string
}

export const InstallationVersion = typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : "local"
export const InstallationChannel = typeof OPENCODE_CHANNEL === "string" ? OPENCODE_CHANNEL : "local"

export function isInstallationLocal(input: { version?: string; channel?: string } = {}) {
  const version = input.version ?? InstallationVersion
  const channel = input.channel ?? InstallationChannel
  return channel === "local" || version === "local" || version.endsWith(".local")
}

export const InstallationLocal = isInstallationLocal()
export const InstallationLocalUpgradeMessage =
  "This is a local build of opencode. Managed auto-update is disabled. Pull or merge the latest code and rebuild locally to upgrade."
