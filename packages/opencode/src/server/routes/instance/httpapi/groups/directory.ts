import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { described } from "./metadata"

export const DirectoryEntry = Schema.Struct({
  name: Schema.String,
  absolute: Schema.String,
}).annotate({ identifier: "DirectoryEntry" })

export const DirectoryListQuery = Schema.Struct({
  path: Schema.String,
})

export const DirectoryPaths = {
  list: "/directory",
} as const

export const DirectoryApi = HttpApi.make("directory")
  .add(
    HttpApiGroup.make("directory")
      .add(
        HttpApiEndpoint.get("list", DirectoryPaths.list, {
          query: DirectoryListQuery,
          success: described(Schema.Array(DirectoryEntry), "Directory entries"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "directory.list",
            summary: "List directories",
            description: "List direct child directories for an absolute server-side directory path without loading an OpenCode instance.",
          }),
        ),
      )
      .annotateMerge(OpenApi.annotations({ title: "directory", description: "Side-effect-free directory browse routes." }))
      .middleware(Authorization),
  )
