# TUI Auto-Attach To Running Serve

**Status:** 已完成

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

## 最后决策

不直接改变opencode命令本身, 改为opencode attache 命令增减默认值处理, url 默认 http://127.0.0.1:4096, --dir 默认为opencode attache命令运行的目录
