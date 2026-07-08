# Task 1: Attach Defaults

> **Status source:** Update this task's row in `index.md`; do not invent task status elsewhere.

**Files:**
- Modify: `packages/opencode/src/cli/cmd/attach.ts:7-145`
- Modify: `packages/opencode/test/cli/tui/attach.test.ts:1-11`
- Modify: `packages/opencode/test/cli/help/__snapshots__/help-snapshots.test.ts.snap:44-68`
- Test: `packages/opencode/test/cli/tui/attach.test.ts`
- Test: `packages/opencode/test/cli/help/help-snapshots.test.ts`

**Interfaces:**
- Consumes: existing `AttachCommand`, `validateSession(...)`, `runMini(...)`, and TUI layer `run(...)` behavior.
- Produces: `DEFAULT_ATTACH_URL: "http://127.0.0.1:4096"` exported from `packages/opencode/src/cli/cmd/attach.ts`.
- Produces: `resolveAttachTarget(input: { url?: string; dir?: string }): { url: string; directory: string }` exported from `packages/opencode/src/cli/cmd/attach.ts`.

- [ ] **Step 1: Write failing resolver tests**

Replace `packages/opencode/test/cli/tui/attach.test.ts` with tests that keep the existing lazy-loading assertion and add resolver coverage:

```ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import path from "path"
import { DEFAULT_ATTACH_URL, resolveAttachTarget } from "../../../src/cli/cmd/attach"
import { tmpdir } from "../../fixture/fixture"

describe("tui attach", () => {
  let cwd = ""

  beforeEach(() => {
    cwd = process.cwd()
  })

  afterEach(() => {
    process.chdir(cwd)
  })

  test("loads the TUI integration lazily", async () => {
    const source = await Bun.file(new URL("../../../src/cli/cmd/attach.ts", import.meta.url)).text()

    expect(source).toContain('await import("../tui/layer")')
    expect(source).toMatch(/await import\(["']@\/plugin\/tui\/runtime["']\)/)
    expect(source).not.toContain('import("./app")')
  })

  test("defaults to the local serve URL and current directory", () => {
    expect(resolveAttachTarget({})).toEqual({
      url: DEFAULT_ATTACH_URL,
      directory: cwd,
    })
  })

  test("preserves an explicit URL", () => {
    expect(resolveAttachTarget({ url: "http://127.0.0.1:5000" })).toEqual({
      url: "http://127.0.0.1:5000",
      directory: cwd,
    })
  })

  test("resolves an explicit local directory through chdir", async () => {
    await using tmp = await tmpdir()

    expect(resolveAttachTarget({ dir: tmp.path })).toEqual({
      url: DEFAULT_ATTACH_URL,
      directory: tmp.path,
    })
    expect(process.cwd()).toBe(tmp.path)
  })

  test("passes through an explicit remote directory when local chdir fails", async () => {
    await using tmp = await tmpdir()
    const remote = path.join(tmp.path, "remote-only")

    expect(resolveAttachTarget({ dir: remote })).toEqual({
      url: DEFAULT_ATTACH_URL,
      directory: remote,
    })
    expect(process.cwd()).toBe(cwd)
  })
})
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run from `packages/opencode`:

```sh
bun test test/cli/tui/attach.test.ts
```

Expected result: the test fails because `DEFAULT_ATTACH_URL` and `resolveAttachTarget` are not exported from `src/cli/cmd/attach.ts` yet.

- [ ] **Step 3: Implement attach defaults in `attach.ts`**

In `packages/opencode/src/cli/cmd/attach.ts`, add the default URL and resolver above `AttachCommand`:

```ts
export const DEFAULT_ATTACH_URL = "http://127.0.0.1:4096"

export function resolveAttachTarget(input: { url?: string; dir?: string }) {
  const directory = (() => {
    if (!input.dir) return process.cwd()
    try {
      process.chdir(input.dir)
      return process.cwd()
    } catch {
      // If the directory doesn't exist locally (remote attach), pass it through.
      return input.dir
    }
  })()

  return {
    url: input.url ?? DEFAULT_ATTACH_URL,
    directory,
  }
}
```

Change the command signature and positional definition:

```ts
export const AttachCommand = cmd({
  command: "attach [url]",
  describe: "attach to a running opencode server",
  builder: (yargs) =>
    yargs
      .positional("url", {
        type: "string",
        describe: `server URL (defaults to ${DEFAULT_ATTACH_URL})`,
      })
      .option("dir", {
        type: "string",
        description: "directory to run in (defaults to current directory)",
      })
```

Inside the handler, replace the inline `directory` IIFE with the resolver:

```ts
const target = resolveAttachTarget({ url: args.url, dir: args.dir })
```

Use `target.url` and `target.directory` everywhere the handler currently uses `args.url` and `directory`:

```ts
await runMini({
  attach: target.url,
  directory: target.directory,
  password: args.password,
  username: args.username,
  continue: args.continue,
  session: args.session,
  fork: args.fork,
  replay: noReplay ? false : undefined,
  replayLimit: args.replayLimit,
})
```

```ts
await validateSession({
  url: target.url,
  sessionID: args.session,
  directory: target.directory,
  headers,
})
```

```ts
await Effect.runPromise(
  run({
    url: target.url,
    config,
    pluginHost: createLegacyTuiPluginHost(),
    args: {
      continue: args.continue,
      sessionID: args.session,
      fork: args.fork,
    },
    directory: target.directory,
    headers,
  }),
)
```

- [ ] **Step 4: Run the focused attach test and confirm it passes**

Run from `packages/opencode`:

```sh
bun test test/cli/tui/attach.test.ts
```

Expected result: all tests in `attach.test.ts` pass.

- [ ] **Step 5: Update the attach help snapshot**

Run from `packages/opencode`:

```sh
bun test test/cli/help/help-snapshots.test.ts --update-snapshots
```

Expected snapshot changes in `packages/opencode/test/cli/help/__snapshots__/help-snapshots.test.ts.snap`:

```text
opencode attach [url]
```

The `url` positional should no longer show `[required]`, should mention `server URL (defaults to http://127.0.0.1:4096)`, and `--dir` should mention `directory to run in (defaults to current directory)`.

- [ ] **Step 6: Run the help snapshot test without updating**

Run from `packages/opencode`:

```sh
bun test test/cli/help/help-snapshots.test.ts
```

Expected result: the help snapshot test passes with the updated snapshot.

- [ ] **Step 7: Run typecheck**

Run from `packages/opencode`:

```sh
bun typecheck
```

Expected result: typecheck passes.

- [ ] **Step 8: Inspect the final diff**

Run from the repository root:

```sh
git diff -- packages/opencode/src/cli/cmd/attach.ts packages/opencode/test/cli/tui/attach.test.ts packages/opencode/test/cli/help/__snapshots__/help-snapshots.test.ts.snap docs/superpowers/specs/2026-07-08-attach-defaults-design.md docs/superpowers/plans/2026-07-08-attach-defaults
```

Expected result: the diff only contains the attach defaults implementation, related tests, updated help snapshot, and superpowers docs.
