# Task 1: Version Helpers

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/core/src/installation/version.ts`
- Modify: `packages/core/test/installation-version.test.ts`

- [ ] **Step 1: Write focused version tests**

Add assertions that `1.2.3.local` and `1.2.3.local.4` are local, and normalization strips a leading `v` plus `.local` and any trailing local metadata.

```ts
expect(isInstallationLocal({ version: "1.2.3.local.4", channel: "latest" })).toBe(true)
expect(isInstallationLocal({ version: "1.2.3.local", channel: "latest" })).toBe(true)
expect(normalizeInstallationVersion("v1.2.3.local")).toBe("1.2.3")
expect(normalizeInstallationVersion("v1.2.3.local.4")).toBe("1.2.3")
expect(normalizeInstallationVersion("v1.2.3")).toBe("1.2.3")
expect(normalizeInstallationVersion("local")).toBeUndefined()
```

- [ ] **Step 2: Run the focused core test**

Run from `packages/core`: `bun test test/installation-version.test.ts`.

Expected before implementation: failing import or assertion for `normalizeInstallationVersion` and `1.2.3.local.4`.

- [ ] **Step 3: Implement helpers**

Implement a regex-backed local version parser in `packages/core/src/installation/version.ts`.

```ts
const LocalVersion = /^v?(\d+\.\d+\.\d+)\.local\.\d+$/

export function normalizeInstallationVersion(version = InstallationVersion) {
  if (version === "local") return undefined
  return version.replace(/^v/, "").replace(LocalVersion, "$1")
}
```

- [ ] **Step 4: Re-run the focused core test**

Run from `packages/core`: `bun test test/installation-version.test.ts`.

Expected after implementation: PASS.
