import { afterEach, describe, expect, test } from "bun:test"
import { Context } from "effect"
import { mkdir } from "fs/promises"
import path from "path"
import { HttpApiApp } from "../../src/server/routes/instance/httpapi/server"
import { DirectoryPaths } from "../../src/server/routes/instance/httpapi/groups/directory"
import { resetDatabase } from "../fixture/db"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"

const context = Context.empty() as Context.Context<unknown>

function request(route: string, query?: Record<string, string>) {
  const url = new URL(`http://localhost${route}`)
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value)
  return HttpApiApp.webHandler().handler(new Request(url), context)
}

afterEach(async () => {
  await disposeAllInstances()
  await resetDatabase()
})

describe("directory HttpApi", () => {
  test(
    "lists direct child directories without opening browsed directories as projects",
    async () => {
      await using tmp = await tmpdir({ git: true })
      const parent = path.join(tmp.path, "parent")
      const subA = path.join(parent, "subA")
      const subB = path.join(parent, "subB")
      await Promise.all([mkdir(subA, { recursive: true }), mkdir(subB, { recursive: true })])
      await Bun.write(path.join(parent, "file.txt"), "ignored")

      const response = await request(DirectoryPaths.list, { path: parent })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual([
        { name: "subA", absolute: subA },
        { name: "subB", absolute: subB },
      ])

      const projects = await request("/project", { directory: tmp.path })
      expect(projects.status).toBe(200)
      const body = (await projects.json()) as Array<{ worktree: string }>
      expect(body.some((project) => project.worktree === parent)).toBe(false)
      expect(body.some((project) => project.worktree === subA)).toBe(false)
      expect(body.some((project) => project.worktree === subB)).toBe(false)
    },
    15_000,
  )

  test("rejects non-directory paths", async () => {
    await using tmp = await tmpdir()
    const file = path.join(tmp.path, "file.txt")
    await Bun.write(file, "not a directory")

    const response = await request(DirectoryPaths.list, { path: file })
    expect(response.status).toBe(400)
  })

  test("rejects relative paths", async () => {
    const response = await request(DirectoryPaths.list, { path: "." })
    expect(response.status).toBe(400)
  })
})
