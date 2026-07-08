import { describe, expect, test } from "bun:test"
import {
  filterProjectDirectories,
  joinProjectInput,
  normalizeProjectInput,
  projectParentDirectory,
} from "../../src/component/dialog-project-add"

describe("dialog project add", () => {
  test("starts from the current project parent directory", () => {
    expect(projectParentDirectory("D:/develop/opencode/lucky-cactus")).toBe("D:/develop/opencode")
    expect(projectParentDirectory("/home/leo/opencode/lucky-cactus")).toBe("/home/leo/opencode")
  })

  test("typing appends to the current directory input", () => {
    expect(joinProjectInput("D:/develop/opencode", "A")).toBe("D:/develop/opencode/A")
    expect(joinProjectInput("D:/develop/opencode", "D:/develop/opencodeA")).toBe("D:/develop/opencode/A")
    expect(joinProjectInput("D:/develop/opencode", "D:/other/repo")).toBe("D:/other/repo")
    expect(joinProjectInput("D:/develop/opencode", "D:\\other\\repo")).toBe("D:/other/repo")
  })

  test("preserves rooted absolute input as the source of truth", () => {
    expect(joinProjectInput("/", "/home")).toBe("/home")
    expect(joinProjectInput("D:/", "D:/repo")).toBe("D:/repo")
    expect(joinProjectInput("D:/develop/opencode", "D:/develop/opencode-next")).toBe("D:/develop/opencode-next")
    expect(joinProjectInput("D:/develop/opencode", "D:/develop/opencode/next")).toBe("D:/develop/opencode/next")
  })

  test("filters direct child directories with fuzzy matching", () => {
    const items = [
      { name: "subA", absolute: "D:/develop/opencode/subA" },
      { name: "subB", absolute: "D:/develop/opencode/subB" },
    ]
    expect(filterProjectDirectories(items, "D:/develop/opencode/A").map((item) => item.absolute)).toEqual([
      "D:/develop/opencode/subA",
    ])
  })

  test("shows direct children when the input equals the browse root", () => {
    const items = [{ name: "subA", absolute: "D:/develop/opencode/subA" }]

    expect(filterProjectDirectories(items, "D:/develop/opencode", "D:/develop/opencode")).toEqual(items)
  })

  test("filters by the query relative to the current browse root", () => {
    const items = [
      { name: "subA", absolute: "D:/develop/opencode/subA" },
      { name: "subB", absolute: "D:/develop/opencode/subB" },
    ]

    expect(filterProjectDirectories(items, "D:/develop/opencode/A", "D:/develop/opencode").map((item) => item.absolute)).toEqual([
      "D:/develop/opencode/subA",
    ])
  })

  test("keeps root and drive parents stable", () => {
    expect(projectParentDirectory("/home")).toBe("/")
    expect(projectParentDirectory("D:/repo")).toBe("D:/")
  })

  test("normalizes windows separators for display and comparison", () => {
    expect(normalizeProjectInput("D:\\develop\\opencode\\")).toBe("D:/develop/opencode")
  })
})
