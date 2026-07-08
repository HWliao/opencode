import { describe, expect, test } from "bun:test"
import { createProjectListOptions, projectDisplayName, projectSearchText } from "../../src/component/dialog-project-list"
import { filterDialogSelectOptions } from "../../src/ui/dialog-select"

describe("dialog project list", () => {
  test("uses project name before worktree basename", () => {
    expect(projectDisplayName({ name: "Named", worktree: "D:/repo/actual" })).toBe("Named")
    expect(projectDisplayName({ worktree: "D:/repo/actual" })).toBe("actual")
    expect(projectDisplayName({ worktree: "/home/leo/opencode/" })).toBe("opencode")
  })

  test("search text includes display name and directory", () => {
    expect(projectSearchText({ name: "Named", worktree: "D:/repo/actual" })).toBe("Named\nD:/repo/actual")
  })

  test("options include directory detail and current marker", () => {
    const options = createProjectListOptions(
      [
        { id: "proj_a", name: "A", worktree: "/repo/a" },
        { id: "proj_b", worktree: "/repo/b" },
      ],
      "proj_a",
    )

    expect(options.map((option) => option.title)).toEqual(["A", "b"])
    expect(options[0]?.details).toEqual(["/repo/a"])
    expect(options[0]?.search).toBe("A\n/repo/a")
    expect(options[0]?.value.project.id).toBe("proj_a")
    expect(options[0]?.value.current).toBe(true)
    expect(options[1]?.value.current).toBe(false)
  })

  test("filters options by directory", () => {
    const options = createProjectListOptions([
      { id: "proj_alpha", name: "Alpha", worktree: "/workspace/client" },
      { id: "proj_beta", name: "Beta", worktree: "/workspace/server" },
    ])

    expect(filterDialogSelectOptions(options, "server").map((option) => option.value.project.id)).toEqual(["proj_beta"])
  })
})
