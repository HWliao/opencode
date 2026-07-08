# Task 1 Report: directory-api

## What I Implemented

- Added a side-effect-free `GET /directory` Server HttpApi group and handler.
- The handler uses `FSUtil.Service.resolve`, `FSUtil.Service.isDir`, and `FSUtil.Service.readDirectoryEntries`.
- The handler returns direct child directories only, as sorted `{ name, absolute }` entries.
- The handler rejects non-directory paths with `HttpApiError.BadRequest`.
- Wired `DirectoryApi` into `InstanceHttpApi` before `FileApi`.
- Wired `directoryHandlers` into the instance handler list before `fileHandlers`.
- Added focused HTTP API tests for directory listing and non-directory rejection.
- Ran `bun run generate` from `packages/client` as required by the repo/task rule.
- Ran `bun packages/sdk/js/script/build.ts` because the actual JS SDK v2 generation path for these server HttpApi routes is `packages/sdk/js`, and this produced `sdk.client.directory.list(...)` in `packages/sdk/js/src/v2/gen/sdk.gen.ts`.

## TDD Evidence

### RED

Command, from `packages/opencode`:

```bash
bun test test/server/httpapi-directory.test.ts
```

Output summary:

```text
bun test v1.3.14 (0d9b296a)

test\server\httpapi-directory.test.ts:

# Unhandled error between tests
-------------------------------
error: Cannot find module '../../src/server/routes/instance/httpapi/groups/directory' from '...\packages\opencode\test\server\httpapi-directory.test.ts'
-------------------------------

 0 pass
 1 fail
 1 error
Ran 1 test across 1 file. [7.12s]
```

This was the expected pre-implementation failure because `groups/directory` and `DirectoryPaths` did not exist.

### Intermediate Implementation Run

Command, from `packages/opencode`:

```bash
bun test test/server/httpapi-directory.test.ts
```

Output summary:

```text
bun test v1.3.14 (0d9b296a)

test\server\httpapi-directory.test.ts:
(fail) directory HttpApi > lists direct child directories without opening browsed directories as projects [7889.60ms]
  ^ this test timed out after 5000ms.

 1 pass
 1 fail
 7 expect() calls
Ran 2 tests across 1 file. [23.72s]
```

The `/directory` assertions completed, and the second test passed. The side-effect check through the existing `/project` route exceeded Bun's default 5s test timeout on this Windows workspace, so I added a 15s timeout to that one test case only.

### GREEN

Command, from `packages/opencode`:

```bash
bun test test/server/httpapi-directory.test.ts
```

Output summary:

```text
bun test v1.3.14 (0d9b296a)

 2 pass
 0 fail
 7 expect() calls
Ran 2 tests across 1 file. [13.64s]
```

Final focused test after SDK generation:

```text
bun test v1.3.14 (0d9b296a)

 2 pass
 0 fail
 7 expect() calls
Ran 2 tests across 1 file. [34.64s]
```

## Tests And Commands Run

- `bun test test/server/httpapi-directory.test.ts` from `packages/opencode`: RED, failed as expected because `groups/directory` did not exist.
- `bun test test/server/httpapi-directory.test.ts` from `packages/opencode`: intermediate failure due Bun 5s timeout in the `/project` side-effect assertion.
- `bun test test/server/httpapi-directory.test.ts` from `packages/opencode`: GREEN, `2 pass`, `0 fail`, `7 expect() calls`.
- `bun run generate` from `packages/client`: completed successfully with output `$ bun run script/build.ts`.
- `bun packages/sdk/js/script/build.ts` from repo root: completed successfully, generated updated SDK v2 files including `Directory` and `OpencodeClient.directory`.
- `bun test test/server/httpapi-directory.test.ts` from `packages/opencode`: final GREEN, `2 pass`, `0 fail`, `7 expect() calls`.
- `bun typecheck` from `packages/opencode`: completed successfully with output `$ tsgo --noEmit`.

## Files Changed

Production:

- `packages/opencode/src/server/routes/instance/httpapi/groups/directory.ts`
- `packages/opencode/src/server/routes/instance/httpapi/handlers/directory.ts`
- `packages/opencode/src/server/routes/instance/httpapi/api.ts`
- `packages/opencode/src/server/routes/instance/httpapi/server.ts`

Tests:

- `packages/opencode/test/server/httpapi-directory.test.ts`

Generated/content diffs:

- `packages/sdk/js/src/v2/gen/sdk.gen.ts`
- `packages/sdk/js/src/v2/gen/types.gen.ts`

Generated files reported modified by `git status` after generation, with no textual diff in `git diff --stat` except line-ending/stat warnings:

- `packages/client/src/generated-effect/.httpapi-codegen.json`
- `packages/client/src/generated-effect/client-error.ts`
- `packages/client/src/generated-effect/client.ts`
- `packages/client/src/generated-effect/index.ts`
- `packages/client/src/generated/.httpapi-codegen.json`
- `packages/client/src/generated/client-error.ts`
- `packages/client/src/generated/client.ts`
- `packages/client/src/generated/index.ts`
- `packages/client/src/generated/types.ts`
- `packages/sdk/js/src/gen/client.gen.ts`
- `packages/sdk/js/src/gen/client/client.gen.ts`
- `packages/sdk/js/src/gen/client/index.ts`
- `packages/sdk/js/src/gen/client/types.gen.ts`
- `packages/sdk/js/src/gen/client/utils.gen.ts`
- `packages/sdk/js/src/gen/core/auth.gen.ts`
- `packages/sdk/js/src/gen/core/bodySerializer.gen.ts`
- `packages/sdk/js/src/gen/core/params.gen.ts`
- `packages/sdk/js/src/gen/core/pathSerializer.gen.ts`
- `packages/sdk/js/src/gen/core/queryKeySerializer.gen.ts`
- `packages/sdk/js/src/gen/core/serverSentEvents.gen.ts`
- `packages/sdk/js/src/gen/core/types.gen.ts`
- `packages/sdk/js/src/gen/core/utils.gen.ts`
- `packages/sdk/js/src/gen/sdk.gen.ts`
- `packages/sdk/js/src/gen/types.gen.ts`
- `packages/sdk/js/src/v2/client.ts`
- `packages/sdk/js/src/v2/data.ts`
- `packages/sdk/js/src/v2/gen/client.gen.ts`
- `packages/sdk/js/src/v2/gen/client/client.gen.ts`
- `packages/sdk/js/src/v2/gen/client/index.ts`
- `packages/sdk/js/src/v2/gen/client/types.gen.ts`
- `packages/sdk/js/src/v2/gen/client/utils.gen.ts`
- `packages/sdk/js/src/v2/gen/core/auth.gen.ts`
- `packages/sdk/js/src/v2/gen/core/bodySerializer.gen.ts`
- `packages/sdk/js/src/v2/gen/core/params.gen.ts`
- `packages/sdk/js/src/v2/gen/core/pathSerializer.gen.ts`
- `packages/sdk/js/src/v2/gen/core/queryKeySerializer.gen.ts`
- `packages/sdk/js/src/v2/gen/core/serverSentEvents.gen.ts`
- `packages/sdk/js/src/v2/gen/core/types.gen.ts`
- `packages/sdk/js/src/v2/gen/core/utils.gen.ts`
- `packages/sdk/js/src/v2/index.ts`
- `packages/sdk/js/src/v2/server.ts`

Report:

- `.superpowers/sdd/task-1-report.md`

## Self-Review Findings

- The directory implementation does not call `InstanceStore.load` or `Project.fromDirectory`.
- The directory group declares only `Authorization` middleware and does not declare `InstanceContextMiddleware`.
- The handler resolves the requested path, verifies it is a directory, reads directory entries, filters to entries with `type === "directory"`, maps to absolute paths, and sorts by name.
- The test checks that browsing `parent`, `subA`, and `subB` does not cause those directories to appear in `/project` results.
- SDK v2 output now includes `Directory`, `DirectoryEntry`, `DirectoryList*` types, and `OpencodeClient.directory.list(...)` for `GET /directory`.

## Concerns

- The task brief says `bun run generate` from `packages/client` should produce the SDK/client directory operation, but `packages/client/src/contract.ts` currently generates from `@opencode-ai/protocol/api`, not `packages/opencode`'s `OpenCodeHttpApi`. That command succeeded but produced no textual `/directory` client diff. I ran the repository's JS SDK generator (`bun packages/sdk/js/script/build.ts`) to generate the actual server OpenAPI SDK v2 method.
- Several generated files remain shown as modified by `git status` with line-ending/stat-only behavior after generation; `git diff --stat` only shows textual generated changes in `packages/sdk/js/src/v2/gen/sdk.gen.ts` and `packages/sdk/js/src/v2/gen/types.gen.ts`.
- The focused test needed a 15s timeout on the side-effect assertion because the existing `/project` request path exceeded Bun's default 5s timeout in this Windows workspace.

## Commits

none (not requested)
