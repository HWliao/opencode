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
