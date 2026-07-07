# OpenCode Server Entrypoints Architecture

## Scope

This document records the current architecture for OpenCode entrypoints that start, attach to, or wrap a server runtime.

It is an architecture investigation note only. It does not propose implementation changes.

## Summary

OpenCode currently has multiple entrypoints that can reach server functionality, but they do not all attach to one shared server automatically.

Some entrypoints start an HTTP server directly, some run a private in-process or worker-backed server runtime, and some connect to an already running server explicitly.

## Entrypoint Matrix

| Entrypoint | External protocol | Server ownership | Attach behavior |
|---|---|---|---|
| `opencode serve` | HTTP/SSE/WebSocket | Starts one headless `Server.listen(...)` runtime | Does not attach |
| `opencode web` | Browser to HTTP server | Starts one `Server.listen(...)` runtime, then opens browser | Does not attach |
| Web app | HTTP SDK client | Does not start server itself | Connects to configured/default HTTP URL |
| Desktop app | Electron renderer to local sidecar HTTP server | Main process starts one sidecar server process | Renderer connects to sidecar URL |
| Default TUI | Internal worker RPC/direct fetch | Starts a TUI worker with its own server app/runtime | Does not auto-attach |
| TUI with network options | HTTP | Worker starts `Server.listen(...)` | TUI connects to worker-started HTTP URL |
| `opencode attach <url>` | HTTP SDK client | Does not start server | Explicitly attaches to supplied server URL |
| `opencode run` default | Direct fetch to in-process server app | Uses `Server.Default().app.fetch(...)` | Does not attach unless `--attach` is provided |
| `opencode run --attach <url>` | HTTP SDK client | Does not start local server | Explicitly attaches to supplied server URL |
| `opencode acp` | ACP NDJSON over stdin/stdout | Starts its own `Server.listen(...)`, then wraps it with an ACP adapter | Does not attach to existing `serve` |

## `opencode serve`

`opencode serve` starts a headless OpenCode HTTP server.

Current behavior:

1. Resolves network options.
2. Calls `Server.listen(opts)`.
3. Keeps the process alive with `Effect.never`.

Relevant code:

- `packages/opencode/src/cli/cmd/serve.ts`
- `packages/opencode/src/server/server.ts`

## `opencode web`

`opencode web` also starts an OpenCode HTTP server, then opens the web interface in the browser.

Current behavior:

1. Resolves network options.
2. Calls `Server.listen(opts)`.
3. Prints local/network access URLs.
4. Opens the browser to the server URL.
5. Keeps the process alive.

Relevant code:

- `packages/opencode/src/cli/cmd/web.ts`
- `packages/opencode/src/server/server.ts`

## Web App

The web app is a client UI. It does not start a server runtime itself.

Current behavior:

1. Builds a `ServerConnection.Http` entry from the current URL or local development defaults.
2. Creates SDK clients with `createOpencodeClient({ baseUrl: server.url })`.
3. Uses the server event stream for updates.

Default URL behavior:

- Hosted app URL containing `opencode.ai` defaults to `http://localhost:4096`.
- Local dev defaults to `http://localhost:4096`, configurable through `VITE_OPENCODE_SERVER_HOST` and `VITE_OPENCODE_SERVER_PORT`.
- Other deployed contexts use `location.origin`.

Relevant code:

- `packages/app/src/entry.tsx`
- `packages/app/src/context/server.tsx`
- `packages/app/src/context/server-sdk.tsx`
- `packages/app/src/utils/server.ts`

## Desktop App

The desktop app uses a sidecar server.

Current behavior:

1. The Electron main process chooses a loopback host and port.
2. It forks `sidecar.js` as an Electron utility process.
3. The sidecar imports the bundled OpenCode server module and calls `Server.listen(...)`.
4. The renderer receives sidecar credentials and registers it as a `ServerConnection.Sidecar`.
5. The app UI uses normal HTTP SDK clients against the sidecar URL.

The desktop sidecar is a dedicated server runtime owned by the desktop process. It is not automatically reused by the default TUI or by `opencode acp`.

Relevant code:

- `packages/desktop/src/main/server.ts`
- `packages/desktop/src/main/sidecar.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/renderer/index.tsx`
- `packages/app/src/context/server.tsx`

## Default TUI

The default TUI does not attach to an existing `opencode serve` automatically.

Current behavior:

1. The TUI command starts a `Worker` from `packages/opencode/src/cli/tui/worker.ts`.
2. The TUI creates an RPC client to that worker.
3. In the default path, SDK fetch calls are routed through RPC to the worker.
4. The worker executes requests through `Server.Default().app.fetch(request)`.
5. Global events are forwarded from the worker to the TUI through RPC.

This means each default TUI process has its own worker-backed server runtime.

Relevant code:

- `packages/opencode/src/cli/cmd/tui.ts`
- `packages/opencode/src/cli/tui/worker.ts`
- `packages/opencode/src/server/server.ts`

## TUI Network Mode

The TUI can expose a real HTTP server when network options are supplied.

Current behavior:

1. The TUI resolves network options.
2. If `--port`, `--hostname`, or mDNS is explicitly used, the TUI treats the transport as external.
3. The TUI asks the worker to run `Server.listen(network)`.
4. The TUI connects to the returned HTTP URL.

This still starts a server owned by the TUI worker. It is not automatic discovery of another `opencode serve` process.

Relevant code:

- `packages/opencode/src/cli/cmd/tui.ts`
- `packages/opencode/src/cli/tui/worker.ts`
- `packages/opencode/src/cli/network.ts`

## `opencode attach <url>`

`opencode attach <url>` is the explicit TUI attach mode.

Current behavior:

1. Accepts a server URL and optional auth credentials.
2. Validates the target session if a session is supplied.
3. Starts the TUI layer with the supplied URL, headers, and directory.
4. Does not start a local server runtime.

Relevant code:

- `packages/opencode/src/cli/cmd/attach.ts`

## `opencode run`

`opencode run` has both local and attach paths.

Default behavior:

1. Uses `Server.Default().app.fetch(...)` through a custom SDK fetch implementation.
2. Sets SDK `baseUrl` to `http://opencode.internal`.
3. Does not start an external HTTP listener.

Attach behavior:

1. If `--attach <url>` is provided, it creates an SDK client with `baseUrl: args.attach`.
2. Requests are sent to the existing server URL.
3. Local server fetch is skipped.

Relevant code:

- `packages/opencode/src/cli/cmd/run.ts`
- `packages/opencode/src/cli/cmd/run/runtime.ts`

## `opencode acp`

`opencode acp` exposes OpenCode through Agent Client Protocol, but it currently starts its own OpenCode server first.

Current behavior:

1. Resolves network options.
2. Calls `Server.listen(opts)`.
3. Creates an OpenCode SDK client using the newly started server URL.
4. Wraps stdin/stdout as an ACP NDJSON stream with `ndJsonStream`.
5. Creates an ACP agent with `ACP.init({ sdk })`.
6. Handles ACP requests by translating them into SDK calls against the server it started.

Current ACP process shape:

```text
ACP client
  -> stdin/stdout ACP NDJSON
  -> opencode acp
  -> OpenCode SDK client
  -> opencode server started by this acp process
```

Relevant code:

- `packages/opencode/src/cli/cmd/acp.ts`
- `packages/opencode/src/acp/agent.ts`
- `packages/opencode/src/acp/service.ts`
- `packages/opencode/src/acp/event.ts`
- `packages/opencode/src/acp/permission.ts`

## ACP Session Behavior

Within one `opencode acp` process, multiple ACP sessions do not start multiple server instances.

Current behavior:

1. One `opencode acp` process starts one OpenCode server.
2. The ACP adapter creates one SDK client for that server.
3. ACP `newSession` maps to `sdk.session.create(...)`.
4. Additional ACP sessions are additional OpenCode sessions under the same server runtime.

Process shape:

```text
one opencode acp process
  -> one Server.listen(...)
  -> one SDK client
  -> many ACP sessions
  -> many OpenCode sessions
```

Starting multiple `opencode acp` processes creates multiple server runtimes.

## ACP And `serve` Sharing

`opencode acp` does not currently share an existing `opencode serve` server.

If both commands are running:

```text
opencode serve
  -> Server.listen(...)

opencode acp
  -> Server.listen(...)
  -> SDK client to its own server
```

They are two separate server instances.

There is currently no `opencode acp --attach <url>` mode in the observed CLI entrypoint.

## Server Listener Defaults

Network options default to a loopback server with `port: 0` and `hostname: 127.0.0.1`.

When the requested port is `0`, `Server.listen` first tries port `4096`, then falls back to any free port if `4096` is unavailable.

Relevant code:

- `packages/opencode/src/cli/network.ts`
- `packages/opencode/src/server/server.ts`

## Architecture Consequences

Current behavior favors explicit ownership over automatic sharing.

Important consequences:

1. `serve`, `web`, desktop sidecar, default TUI worker, and `acp` can each own separate server runtimes.
2. Default TUI instances do not automatically detect and attach to an existing server.
3. `opencode attach <url>` is the explicit TUI attach path.
4. `opencode run --attach <url>` is the explicit non-interactive attach path.
5. `opencode acp` is currently an ACP adapter around a server it starts itself, not an adapter around an existing `serve` process.
6. Multiple sessions within one server runtime share that runtime, but multiple entrypoint processes can still create multiple runtimes.
