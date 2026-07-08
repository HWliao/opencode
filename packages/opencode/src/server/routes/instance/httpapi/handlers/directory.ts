import { FSUtil } from "@opencode-ai/core/fs-util"
import { Effect } from "effect"
import path from "path"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"

export const directoryHandlers = HttpApiBuilder.group(InstanceHttpApi, "directory", (handlers) =>
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service

    const list = Effect.fn("DirectoryHttpApi.list")(function* (ctx: { query: { path: string } }) {
      if (!isAbsoluteInput(ctx.query.path)) return yield* new HttpApiError.BadRequest({})
      const directory = yield* fs.resolve(ctx.query.path).pipe(Effect.catchDefect(() => new HttpApiError.BadRequest({})))
      if (!(yield* fs.isDir(directory).pipe(Effect.catch(() => new HttpApiError.BadRequest({})))))
        return yield* new HttpApiError.BadRequest({})
      const entries = yield* fs.readDirectoryEntries(directory).pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
      return entries
        .filter((entry) => entry.type === "directory")
        .map((entry) => ({ name: entry.name, absolute: path.join(directory, entry.name) }))
        .sort((a, b) => a.name.localeCompare(b.name))
    })

    return handlers.handle("list", list)
  }),
)

function isAbsoluteInput(input: string) {
  return path.isAbsolute(input) || /^[A-Za-z]:[\\/]/.test(input)
}
