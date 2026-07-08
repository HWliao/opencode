# Attach Defaults Design

## Status

Approved by user. Implementation plan written.

Source issue: `docs/isusses/tui-auto-attach-serve.md`.

## Problem

The original issue asks for the TUI to reuse a running `opencode serve` instance instead of always starting its own worker-backed runtime. The current final decision narrows the implementation: do not change the default `opencode` TUI command. Instead, make `opencode attach` easier to use by giving it sensible defaults.

Today `opencode attach` requires a positional URL. A user who starts `opencode serve` with default network settings must still type `opencode attach http://127.0.0.1:4096` or `opencode attach http://localhost:4096`. The command also only sends a directory to the server when `--dir` is provided. That makes the simplified attach flow longer than necessary and can omit the intended local project directory.

## Goals

- Allow `opencode attach` with no URL argument.
- Default the attach URL to `http://127.0.0.1:4096` when no URL is supplied.
- Default the attach directory to the directory where `opencode attach` is run when `--dir` is not supplied.
- Preserve explicit URL and `--dir` behavior.
- Preserve existing auth, session, fork, mini, validation, and TUI startup behavior.
- Keep the default `opencode` TUI command unchanged.

## Non-Goals

- Do not make the default `opencode` command auto-detect or attach to `opencode serve`.
- Do not change `opencode run --attach` semantics.
- Do not add server discovery, health probing, mDNS lookup, or fallback from attach to worker mode.
- Do not change `opencode serve` network defaults.
- Do not redesign project switching or project management in the TUI.

## Existing Flow

`opencode serve` resolves network options through `packages/opencode/src/cli/network.ts`, then calls `Server.listen(...)` from `packages/opencode/src/server/server.ts`. The network default is `hostname: "127.0.0.1"` and `port: 0`. `Server.listen(...)` treats port `0` as "try 4096 first, then fall back to any free port".

`opencode attach <url>` is implemented in `packages/opencode/src/cli/cmd/attach.ts`. It currently requires the URL positional argument and passes `args.url` into either the full TUI layer or `runMini(...)`. If `--dir` is provided, it attempts to `process.chdir(args.dir)` and uses the resulting `process.cwd()`. If the local chdir fails, it passes the original `--dir` value through as a remote directory path.

The default TUI command is implemented in `packages/opencode/src/cli/cmd/tui.ts`. It starts a worker and routes SDK calls through worker RPC unless explicit network options make the worker start an external HTTP server. This design intentionally leaves that path unchanged.

## Design

Change `AttachCommand` so the positional URL is optional:

- Command signature becomes `attach [url]`.
- The positional `url` no longer has `demandOption: true`.
- The handler computes an effective URL as `args.url ?? "http://127.0.0.1:4096"`.
- All validation, TUI layer startup, and `runMini(...)` calls use the effective URL.

Change directory resolution so `opencode attach` always carries an intended directory:

- If `--dir` is omitted, use `process.cwd()` as the directory.
- If `--dir` is provided and local `chdir` succeeds, use the resolved `process.cwd()`.
- If `--dir` is provided and local `chdir` fails, keep the existing remote attach behavior by passing `args.dir` through unchanged.

This keeps the command explicit: users still choose attach mode by running `opencode attach`. The only behavior change is reducing required flags for the common local `opencode serve` case.

## User-Facing Behavior

After the change, these commands are equivalent for a default local server:

```sh
opencode attach
opencode attach http://127.0.0.1:4096 --dir "$PWD"
```

Explicit values still override defaults:

```sh
opencode attach http://127.0.0.1:5000 --dir /path/to/project
opencode attach https://remote.example.com --dir /remote/project/path
```

Help output should show the URL positional as optional and document the default URL. The `--dir` option should state that it defaults to the current directory.

If no server is listening on `http://127.0.0.1:4096`, existing validation or connection error behavior should surface the failure. The command should not silently start a worker or retry another port.

## Error Handling

Connection failures, auth failures, and session validation failures continue through the existing `validateSession(...)` and TUI error handling paths.

For explicit `--dir`, the existing local-failure behavior remains important for remote attach: a path that does not exist on the client may still be valid on the server. For omitted `--dir`, `process.cwd()` is already the process directory and should not need the remote fallback branch.

## Testing

Add focused tests in `packages/opencode/test/cli/tui/attach.test.ts` or an adjacent CLI attach test file:

- `opencode attach` defaults the URL to `http://127.0.0.1:4096`.
- `opencode attach` defaults the directory to the process cwd when `--dir` is omitted.
- An explicit URL overrides the default URL.
- An explicit local `--dir` still resolves through `process.chdir(...)`.
- A failing explicit `--dir` still passes the original value through for remote attach.

Update the CLI help snapshot for `opencode attach --help` so it reflects `attach [url]`, the optional positional, and the documented defaults.

Run tests from `packages/opencode`, not from the repository root.

## Acceptance Criteria

- Running `opencode attach` with no URL attempts to connect to `http://127.0.0.1:4096`.
- Running `opencode attach` with no `--dir` passes the command's current working directory as the attach directory.
- Existing explicit URL and explicit `--dir` behavior continues to work.
- `opencode attach --mini` receives the same effective URL and directory defaults.
- The default `opencode` TUI command still starts through its current worker-backed path.
- CLI help and tests cover the new defaults.
