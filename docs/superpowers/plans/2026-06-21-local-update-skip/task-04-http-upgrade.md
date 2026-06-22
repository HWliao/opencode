# Task 4: HTTP Upgrade

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts:1-156`
- Modify: `packages/opencode/test/server/httpapi-global.test.ts:1-66`
- Modify: `packages/tui/src/app.tsx:1019-1034`

- [ ] **Step 1: Write the failing HTTP API local-build test**

In `packages/opencode/test/server/httpapi-global.test.ts`, update the imports from:

```ts
import { describe, expect } from "bun:test"
```

to:

```ts
import { InstallationLocalUpgradeMessage } from "@opencode-ai/core/installation/version"
import { afterEach, describe, expect, mock, spyOn } from "bun:test"
```

Add this import beside the existing opencode imports:

```ts
import { Installation as InstallationModule } from "../../src/installation"
```

Add this cleanup before `const apiLayer = ...`:

```ts
afterEach(() => {
  mock.restore()
})
```

In the existing `upgrades to latest when the request body is omitted` test, add the non-local spy as the first line inside `Effect.gen`:

```ts
      spyOn(InstallationModule, "isLocal").mockReturnValue(false)
```

Then add this new test inside `describe("global HttpApi", () => { ... })`:

```ts
  it.live("refuses managed upgrades for local builds", () =>
    Effect.gen(function* () {
      spyOn(InstallationModule, "isLocal").mockReturnValue(true)

      const response = yield* HttpClient.post(GlobalPaths.upgrade)

      expect(response.status).toBe(400)
      expect(yield* response.json).toEqual({ success: false, error: InstallationLocalUpgradeMessage })
    }),
  )
```

- [ ] **Step 2: Run the HTTP API test to verify it fails**

Run from `packages/opencode`:

```bash
bun test test/server/httpapi-global.test.ts
```

Expected: FAIL because `/global/upgrade` still resolves the installation method and returns success for local builds.

- [ ] **Step 3: Guard `/global/upgrade` before resolving the install method**

In `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts`, change the version import from:

```ts
import { InstallationVersion } from "@opencode-ai/core/installation/version"
```

to:

```ts
import { InstallationLocalUpgradeMessage, InstallationVersion } from "@opencode-ai/core/installation/version"
```

Then add this guard as the first branch inside `const upgrade = Effect.fn("GlobalHttpApi.upgrade")(...`:

```ts
      if (Installation.isLocal()) {
        return {
          status: 400,
          body: { success: false as const, error: InstallationLocalUpgradeMessage },
        }
      }
```

The start of the handler should read:

```ts
    const upgrade = Effect.fn("GlobalHttpApi.upgrade")(function* (ctx: { payload: typeof GlobalUpgradeInput.Type }) {
      if (Installation.isLocal()) {
        return {
          status: 400,
          body: { success: false as const, error: InstallationLocalUpgradeMessage },
        }
      }
      const method = yield* installation.method()
```

- [ ] **Step 4: Show structured API errors in the TUI update prompt path**

In `packages/tui/src/app.tsx`, replace this block:

```ts
    if (result.error || !result.data?.success) {
      toast.show({
        variant: "error",
        title: "Update Failed",
        message: "Update failed",
        duration: 10000,
      })
      return
    }
```

with:

```ts
    if (result.error || !result.data?.success) {
      toast.show({
        variant: "error",
        title: "Update Failed",
        message: result.data && !result.data.success ? result.data.error : "Update failed",
        duration: 10000,
      })
      return
    }
```

- [ ] **Step 5: Run the HTTP API test to verify it passes**

Run from `packages/opencode`:

```bash
bun test test/server/httpapi-global.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts packages/opencode/test/server/httpapi-global.test.ts packages/tui/src/app.tsx
git commit -m "fix(opencode): refuse local http upgrades"
```
