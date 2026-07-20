# Serve Port Not Released After Ctrl+C

**Status:** 待调查

## Summary

运行 `opencode serve` 后使用 `Ctrl+C` 结束进程，监听端口可能未被回收，后续无法正常使用该端口。

## Reproduction

1. 运行以下命令启动服务：

   ```sh
   opencode serve --hostname 0.0.0.0 --port 4096
   ```

2. 使用 `Ctrl+C` 结束服务进程。
3. 再次检查或尝试使用 `4096` 端口。

## Expected

服务进程收到 `Ctrl+C` 后应正常退出，并释放 `4096` 端口。

## Actual

`4096` 端口未被回收。通过端口无法定位到正常应用进程，且无法通过常规方式终止占用该端口的进程。

## Investigation

当前源码与本机安装版本（`1.17.14.local.6`）均使用 `SIGINT` 在随机高位端口完成过隔离复现：子进程以退出码 `130` 退出，并可立即重新绑定原端口，未复现端口残留。

对 `4096` 的只读检查显示端口实际处于 `LISTEN` 状态，由仍存活的 `opencode.exe` 进程持有，而非无主套接字或 `TIME_WAIT` 状态。该进程的命令行为：

```text
opencode.exe serve --hostname 0.0.0.0 --port 4096
```

其父进程为 `pwsh.exe`。目前未向该进程发送终止信号。需要确认启动命令所在终端中 `Ctrl+C` 是否实际传递到子进程，以及是否存在外部进程组或终端复用行为拦截了该信号。
