# Task 2: Upgrade Flows

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/cli/upgrade.ts`
- Modify: `packages/opencode/src/cli/cmd/upgrade.ts`
- Modify: `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts`
- Modify: `packages/opencode/test/cli/upgrade-check.test.ts`
- Modify: `packages/opencode/test/cli/upgrade-command.test.ts`
- Modify: `packages/opencode/test/server/httpapi-global.test.ts`

- [ ] **Step 1: Update entry-point tests first**

Change local tests so they expect method/latest or target resolution before local refusal. Add an already-current local case where no local notice or upgrade occurs.

```ts
await upgrade({
  currentVersion: "1.2.3.local.4",
  getConfig: async () => ({ autoupdate: true }),
  isLocal: () => true,
  method,
  latest,
  install,
  emit,
})

expect(method).toHaveBeenCalled()
expect(latest).toHaveBeenCalledWith("npm")
expect(install).not.toHaveBeenCalled()
```

Add a case for `1.17.9.local` with latest `1.17.9` so local builds without a numeric suffix are treated as already current rather than upgraded.

- [ ] **Step 2: Run focused opencode tests to confirm failure**

Run from `packages/opencode`: `bun test test/cli/upgrade-check.test.ts test/cli/upgrade-command.test.ts test/server/httpapi-global.test.ts`.

Expected before implementation: tests fail because current code blocks before latest/target resolution.

- [ ] **Step 3: Update automatic check flow**

Move `Installation.isLocal()` handling after method/latest lookup and normalized version comparison. Use normalized current version for `getReleaseType`.

```ts
const method = await (input.method ?? Installation.method)()
const latest = await (input.latest ?? Installation.latest)(method).catch(() => {})
if (!latest) return

const currentVersion = normalizeInstallationVersion(input.currentVersion ?? InstallationVersion)
if (currentVersion === latest) return
if ((input.isLocal ?? Installation.isLocal)()) {
  emit("event", localToast)
  return
}
```

- [ ] **Step 4: Update manual CLI flow**

Resolve method and target first. Compare target with normalized current version. Refuse local only when target differs.

```ts
const target = args.target ? normalizeInstallationVersion(args.target) ?? args.target.replace(/^v/, "") : await Installation.latest(method)
const currentVersion = normalizeInstallationVersion(InstallationVersion)
if (currentVersion === target) return alreadyInstalled
if (Installation.isLocal()) return localRefusal
```

- [ ] **Step 5: Update HTTP API flow**

Resolve method and target first. Compare target with normalized current version. Return the local refusal before `installation.upgrade(...)` only when target differs.

- [ ] **Step 6: Re-run focused opencode tests**

Run from `packages/opencode`: `bun test test/cli/upgrade-check.test.ts test/cli/upgrade-command.test.ts test/server/httpapi-global.test.ts`.

Expected after implementation: PASS.
