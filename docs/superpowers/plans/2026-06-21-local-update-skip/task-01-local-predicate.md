# Task 1: Local Predicate

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/core/src/installation/version.ts:1-8`
- Modify: `packages/opencode/src/installation/index.ts:14-65`
- Create: `packages/core/test/installation-version.test.ts`

- [ ] **Step 1: Write the failing core predicate test**

Create `packages/core/test/installation-version.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the new core test to verify it fails**

Run from `packages/core`:

```bash
bun test test/installation-version.test.ts
```

Expected: FAIL because `isInstallationLocal` and `InstallationLocalUpgradeMessage` are not exported yet.

- [ ] **Step 3: Add the shared predicate and message**

Replace `packages/core/src/installation/version.ts` with:

```ts
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
```

- [ ] **Step 4: Route opencode installation local detection through the shared predicate**

In `packages/opencode/src/installation/index.ts`, change the version import from:

```ts
import { InstallationChannel, InstallationVersion } from "@opencode-ai/core/installation/version"
```

to:

```ts
import { InstallationChannel, InstallationLocal, InstallationVersion } from "@opencode-ai/core/installation/version"
```

Then replace the `isLocal()` function with:

```ts
export function isLocal() {
  return InstallationLocal
}
```

- [ ] **Step 5: Run the core predicate test to verify it passes**

Run from `packages/core`:

```bash
bun test test/installation-version.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/installation/version.ts packages/core/test/installation-version.test.ts packages/opencode/src/installation/index.ts
git commit -m "fix(core): detect local build versions"
```
