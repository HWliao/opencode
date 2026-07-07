# TUI Auto-Attach To Running Serve

**Status:** 未开始

## Summary

The TUI should automatically detect a running `opencode serve` instance and attach to it instead of always starting its own worker-backed server runtime.

## Current Behavior

1. Starting the default TUI creates a new worker.
2. The worker uses its own server runtime through internal RPC/direct fetch.
3. Multiple TUI launches can therefore create multiple independent server runtimes unless the user explicitly runs `opencode attach <url>`.

## Expected

When a compatible local `opencode serve` instance is already running, the TUI should attach to that server automatically.

## Actual

The TUI currently starts its own worker-backed runtime by default and only attaches to an existing server through explicit attach flow.

## Investigation

Not started. This issue is only recorded for follow-up design and investigation.
