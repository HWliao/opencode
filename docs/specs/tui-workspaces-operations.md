# TUI Workspaces 操作手册

## 范围

本文记录当前 OpenCode TUI 中 experimental workspaces 的实际操作方式。

重点覆盖：如何启用功能、创建 workspace、把 session 移入或移出 workspace、删除和恢复 workspace，以及如何在单个项目内用 TUI 操作 5 路并发工作流。

本文只覆盖 `packages/tui` 和 experimental workspace HttpApi，不覆盖 Console 产品里的账号/组织 workspace 模型。

## 前置条件

workspace 功能仍是 experimental。启动 TUI 前需要启用以下环境变量之一：

```sh
OPENCODE_EXPERIMENTAL_WORKSPACES=true opencode <project>
```

或启用全部 experimental 功能：

```sh
OPENCODE_EXPERIMENTAL=true opencode <project>
```

PowerShell 示例：

```powershell
$env:OPENCODE_EXPERIMENTAL_WORKSPACES = "true"
opencode <project>
```

如果未启用该开关，TUI 会隐藏 workspace 管理命令和 prompt 层面的 `Warp` 操作。

## 核心概念

TUI workspace 是挂在项目下的执行目标，session 可以绑定到某个 workspace，也可以回到本地项目。

当前内置 adapter 是 `worktree`：

- 创建内置 workspace 会创建一个 git worktree。
- workspace 记录包含 `id`、`type`、`name`、`branch`、`directory`、`projectID`、`timeUsed`。
- 一个 session 可以绑定一个 workspace，也可以通过 `None` 解除绑定，回到本地项目。
- 删除 workspace 会先删除绑定在它上面的 sessions，再停止 workspace sync，调用 adapter 删除目标目录，最后删除数据库中的 workspace 记录。
- 插件可以注册额外 workspace adapter；默认内置能力只有 `Worktree`。

workspace 状态包括 `connected`、`connecting`、`disconnected`、`error`。本地 worktree workspace 的目录存在时会被视为 connected。

## Worktree 创建细节

当前 TUI 内置 `Worktree` workspace 创建流程不是复制项目目录，而是创建一个独立 git worktree。

创建链路：

1. TUI `/warp` 选择 `Worktree`。
2. TUI 调用 `experimental.workspace.create({ type: "worktree", branch: null })`。
3. 后端自动生成 workspace 名称和目录。
4. 内置 adapter 调用 `git worktree add --no-checkout --detach <directory> HEAD`。
5. 后台在新 worktree 中执行 `git reset --hard` 填充文件。
6. OpenCode 加载该目录对应的 project instance，并发送 ready 或 failed 事件。

当前 TUI 创建 workspace 时传入 `branch: null`，而 `WorktreeAdapter.configure(...)` 使用 `makeWorktreeInfo({ detached: true })`。因此 TUI 创建出的 worktree 是 detached worktree，不会自动创建或绑定 `opencode/<name>` 这类分支。

## 目录位置

TUI 创建 `Worktree` workspace 时，用户不需要也不能在界面中手动选择 workspace 目录。

默认目录规则：

```text
<Global.Path.data>/worktree/<projectID>/<workspaceName>
```

`Global.Path.data` 来自系统 XDG data 目录下的 `opencode`。如果通过 `XDG_DATA_HOME` 等环境变量整体调整 OpenCode data 根目录，workspace worktree 目录也会随之变化。

注意事项：

- 当前没有单独的 `workspaceDir` 配置项。
- 调整全局 data 根目录会同时影响数据库、log、repos 和其他 data 下运行数据。
- 已创建 workspace 记录保存的是实际目录路径；修改全局 data 根目录不会自动迁移旧 worktree 或修复旧记录。

## Branch 和共享 Workspace

workspace 记录结构中有 `branch` 字段，但当前 TUI 内置创建流程默认生成 detached worktree。

因此当前操作模型是：

- workspace 对应一个具体 worktree 目录。
- 该目录同一时刻只能 checkout 一个 HEAD 或 branch。
- 多个 session 可以绑定到同一个 workspace，但它们共享同一份工作树状态。
- 同一个 workspace 不能让不同 session 同时绑定不同 branch。

如果多个 session 同时绑定同一个 workspace，它们会在同一目录中读写文件。除非明确需要协作编辑同一份工作树，否则不建议把并发编辑任务放到同一个 workspace。

需要不同 branch 或隔离工作区时，应创建多个独立 workspaces，并让每个 session 绑定自己的 workspace。

## TUI 入口

常用入口如下：

| 操作 | 默认快捷键 | Slash 命令 | 说明 |
|---|---:|---:|---|
| 打开命令面板 | `ctrl+p` | | 查找所有 TUI 命令。 |
| 新建 session | `ctrl+x n` | `/new` | 回到 home/new-session prompt。 |
| 切换 session | `ctrl+x l` | `/sessions` | 打开 session 列表。 |
| Warp 当前 prompt/session | 无默认快捷键 | `/warp` | 选择不使用 workspace、新 workspace 或已有 workspace。 |
| 管理 workspaces | 无默认快捷键 | `/workspaces` | 列出和删除 workspace。 |
| 快速切换槽位 | `ctrl+x 1` 到 `ctrl+x 9` | | 跳转到已 pin 的 session。 |
| Pin/unpin session | session 列表中 `ctrl+f` | | 前 9 个已 pin 根 session 会成为快速切换槽位。 |

`ctrl+x` 是默认 leader key。

## 为新 Session 创建 Workspace

适用于开始一条新的独立工作流。

1. 使用 `OPENCODE_EXPERIMENTAL_WORKSPACES=true` 启动 TUI。
2. 按 `ctrl+x n` 或运行 `/new`，进入新 session prompt。
3. 在 prompt 中运行 `/warp`。
4. 在 `New workspace` 分组下选择 `Worktree`。
5. 等待 prompt 下方的 `Creating worktree...` 状态结束。
6. 输入任务 prompt，按 `Enter` 提交。

提交时，新 session 会带上已选 workspace ID。workspace 创建未完成时，prompt 不会提交。

从已有 workspace session 按 `ctrl+x n` 或 `/new` 回到 home 后，新 session 不一定自动继承上一个 session 的 workspace。创建新 session 时是否绑定 workspace，取决于新 session prompt 下方是否显示 `Workspace <name>`：

- 有显示：提交后新 session 会带上该 workspace。
- 无显示：提交后新 session 会创建在本地项目，需要重新 `/warp` 选择 workspace。

如果想基于当前 workspace session 开新分支对话，更稳定的方式是使用 `/fork`，或在提交前确认 prompt 下方的 workspace label 仍然存在。

## Warp 已有 Session

适用于把已有 session 移到另一个 workspace，或移回本地项目。

操作步骤：

1. 打开目标 session。
2. 运行 `/warp`。
3. 选择目标：

| 选项 | 行为 |
|---|---|
| `New workspace` 下的 `Worktree` | 创建新的 worktree workspace，并把 session 移入。 |
| 已有 workspace | 把 session 移入一个已 connected 的 workspace。 |
| `None` | 解除 workspace 绑定，回到本地项目。 |

如果源 workspace 有文件改动，TUI 会询问是否把这些改动一起移动到目标 workspace。

选择移动文件改动时，OpenCode 会从源 workspace 读取 raw VCS diff，并在目标 workspace 中先 apply 该 diff。只有 apply 成功后，才会切换 session 的 workspace。若因冲突或基础分支不一致导致 apply 失败，本次 warp 会中止，session 仍留在原位置。

warp 成功后，TUI 会向 session 发送一条 synthetic reminder，提醒当前工作目录已经变化。

移入 workspace 时，后端会做这些事：

- 读取 session 当前绑定的 `workspace_id`。
- 如果 session 原本在某个 workspace 中，先处理旧 workspace。
- 对本地 worktree 旧 workspace，会取消该 session 正在旧 workspace 中运行的 prompt。
- 标记事件归属，避免旧 workspace 后续事件继续写回这个 session。
- 如果选择复制文件改动，并且 session 原本有 workspace，则从源 workspace 生成 raw patch。
- 在目标 workspace 中先 apply patch。
- patch apply 成功后，才把 session 的 `workspace_id` 更新为目标 workspace。

移出 workspace 时，也就是 `/warp` 选择 `None`，后端会把 session 的 `workspace_id` 清空。旧 workspace 不会自动删除，文件改动仍留在旧 worktree 目录中；如果需要把改动带回主目录，应在提示时选择复制文件改动。

从本地项目移入 worktree 时，当前实现不会自动复制本地项目中的未提交改动，因为源码只在 session 当前已有 `workspace_id` 时生成 `sourcePatch`。

## 文件改动和 `.gitignore` 边界

warp 的 `copyChanges` 不是文件级目录同步，而是 git patch 迁移。

当前实现：

- 源端调用 `vcs.diffRaw()` 生成 patch。
- tracked 文件改动来自 `git diff --patch HEAD -- .`。
- 未跟踪且未被忽略的 `??` 文件会通过 `git diff --no-index /dev/null <file>` 转为 patch。
- 目标端调用 `git apply -` 应用 patch。

因此会被迁移的内容包括：

- Git 已跟踪文件的修改、删除和新增。
- 未被 `.gitignore` 忽略的 untracked 文件。

不会被迁移的内容包括：

- `.gitignore` 忽略文件，例如 `.env`、本地密钥、缓存、依赖目录、生成目录。
- Git patch 无法表达或 apply 失败的内容。

如果 5 路并发任务依赖 ignored 文件，需要在每个 worktree 中单独准备，例如从 `.env.example` 生成 `.env`，重新安装依赖，或运行项目自己的初始化脚本。

## 复用旧 Workspace 的目录状态

workspace 目录不会在 session 移出后自动跟随 home 更新。

典型场景：

1. `session A` 移入 `workspace A`。
2. 在 `workspace A` 中完成开发。
3. `session A` 通过 `/warp` 选择 `None` 移出 `workspace A`。
4. 选择复制文件改动，把 `workspace A` 的 patch apply 到 home。
5. 过一段时间后，home 目录已有大量新变化。
6. `session B` 再次移入同一个 `workspace A`。

此时 `workspace A` 的文件状态不是 home 的最新状态，而是：

```text
workspace A = 当初创建 worktree 时的 detached HEAD
            + session A 开发留下的 workspace 本地改动
            + 后续在 workspace A 中手动产生的变化
```

关键边界：

- `copyChanges=yes` 只把源 workspace 的 diff apply 到目标目录。
- 它不会清理源 workspace 的本地改动。
- 它不会把源 workspace reset 到干净状态。
- home 后续发生的大量变化，不会自动同步回旧 workspace。
- 后续 session 绑定到旧 workspace 后，看到的是旧 workspace 目录当前实际状态。

因此不建议复用已经完成并合回 home 的旧 workspace。完成一条 lane 后，先确认改动已经保留、合并或迁移，再删除对应 workspace。后续新任务应创建新的 `Worktree` workspace。

如果必须复用旧 workspace，应先复制路径并在该目录中手动检查 `git status`，确认它是否需要 reset、clean、更新到目标基线，或处理与 home 的差异。

## 模型上下文中的 Workspace 感知

绑定 workspace 后，模型能看到当前工作目录已经变化，但默认不一定知道 OpenCode workspace 的 ID、名称或类型。

当前 system environment 会注入：

```text
Working directory: <ctx.directory>
Workspace root folder: <ctx.worktree>
Is directory a git repo: yes/no
```

如果 session 绑定在 worktree workspace 中，`Working directory` 和 `Workspace root folder` 会指向该 worktree workspace 的目录。assistant message 记录中也会保存 `path: { cwd, root }`。

通过 `/warp` 移入或移出 workspace 时，TUI 还会发送 synthetic reminder，提醒当前工作目录已经变成某个目录，并说明这仍是同一个项目但位于可能不同的位置。

默认不会显式告诉模型这些 OpenCode workspace 元数据：

- workspace ID，例如 `wrk_xxx`
- workspace name
- workspace type，例如 `worktree`
- 当前 lane 编号或用途

因此，如果需要让模型稳定知道“这是 workspace A / lane 1 / 用于某个任务”，应在 session 首条 prompt 或 warp 之后显式说明。

## 管理和删除 Workspaces

通过 `/workspaces` 或命令面板中的 `Manage workspaces` 打开管理弹窗。

弹窗行为：

- 按 workspace 名称排序展示当前项目的所有 workspaces。
- footer 显示 workspace 类型，例如 `worktree`。
- 绿色圆点表示 `connected`，红色圆点表示非 connected 或 error。
- 在某一行按 `Enter` 可以展开或收起它的目录路径。

删除 workspace：

1. 高亮目标 workspace。
2. 触发 `delete` action，默认快捷键是 `ctrl+d`。
3. 当行文案变成 `Delete <name>? Press delete again` 后，再按一次 `ctrl+d` 确认。

删除后的实际行为：

- TUI 调用 `experimental.workspace.remove`。
- 后端先删除绑定到该 workspace 的 sessions。
- 停止该 workspace 的 sync。
- 调用 adapter 删除 workspace 目标；内置 worktree adapter 会删除 git worktree 目录。
- 删除数据库中的 workspace 记录。
- 如果删除的是当前 workspace，TUI 会清空当前 workspace 并回到 home。

## 刷新和维护

TUI 会在以下时机刷新 workspace 状态：

- 打开 workspace selector 时，调用 `experimental.workspace.syncList` 并重新加载项目 workspace 列表。
- 打开 workspace 管理弹窗时，调用 `experimental.workspace.syncList` 并重新加载项目 workspace 列表。
- experimental workspaces 启用后，TUI 在订阅 global events 之后启动 workspace syncing。
- workspace 状态变化会通过 `workspace.status` 事件推送到 TUI。

`syncList` 会读取注册 adapter 返回的 workspaces，并把缺失记录注册到当前项目。它不会删除已有但 adapter 不再返回的记录；这类记录会通过状态体现为不可用或 error。

当前 workspace 是 worktree 时，可以在命令面板里执行 `Copy worktree path`，复制当前 workspace 目录。

## 不可用 Workspace 的恢复

如果一个 session 绑定的 workspace 已不可用，继续提交 prompt 时会出现 `Workspace Unavailable`。

选择 `restore` 会打开 workspace selector，可以把该 session 恢复到新的或已有 workspace。

删除 session 也有恢复路径。如果删除 session 时因为它绑定的 workspace 不可用而失败，session 列表会打开恢复弹窗，可以：

- 删除不可用 workspace。
- 把 session 恢复到新的或已有 workspace。

## 单项目 5 路并发操作

TUI 里没有名为 `concurrency = 5` 的单一配置项。单项目 5 并发的推荐做法是：在同一个项目下创建 5 个根 sessions，并在可能改文件的情况下为每个 session 分配独立 worktree workspace。

推荐流程：

1. 使用 `OPENCODE_EXPERIMENTAL_WORKSPACES=true` 启动 TUI。
2. 创建第 1 条工作流：按 `ctrl+x n`，运行 `/warp`，选择 `Worktree`，提交第 1 个任务 prompt。
3. 打开 session 列表：按 `ctrl+x l`。
4. 高亮刚创建的 session，按 `ctrl+f` pin。
5. 重复以上步骤，直到创建并 pin 5 个根 sessions。
6. 使用 `ctrl+x 1` 到 `ctrl+x 5` 在 5 个 pinned sessions 之间快速切换。

操作约定：

- 一条任务对应一个 session。
- 可能修改文件的任务建议一条任务对应一个 worktree workspace，降低互相覆盖和冲突的概率。
- 给 session 重命名，或使用清晰的首条 prompt，让 5 条 lane 容易识别。
- session 列表 gutter 中，busy 或 retrying session 会显示 spinner；已 pin session 会显示槽位数字。
- 切换离开某个 session 不会删除它，它仍保留在 session 列表中，并可以继续上报状态。
- 每条 lane 完成后，确认需要的改动已经保留、合并或迁移，再通过 `/workspaces` 删除对应 workspace。

操作表：

| Lane | Workspace | Session 操作 | 快速切换 |
|---:|---|---|---:|
| 1 | 新 `Worktree` | 在 session 列表 pin | `ctrl+x 1` |
| 2 | 新 `Worktree` | 在 session 列表 pin | `ctrl+x 2` |
| 3 | 新 `Worktree` | 在 session 列表 pin | `ctrl+x 3` |
| 4 | 新 `Worktree` | 在 session 列表 pin | `ctrl+x 4` |
| 5 | 新 `Worktree` | 在 session 列表 pin | `ctrl+x 5` |

## Workspace 使用最佳实践

推荐按“短生命周期、单任务、独立 worktree”的方式使用 TUI workspaces。

创建与分配：

- 一条独立任务使用一个独立 session。
- 可能改文件的任务使用一个独立 `Worktree` workspace。
- 不要让多个并发编辑任务共享同一个 workspace，除非明确需要它们协作修改同一份工作树。
- 创建 session 前确认 prompt 下方是否显示目标 `Workspace <name>`。
- 对 5 路并发，创建 5 个根 sessions，并 pin 到 `ctrl+x 1` 到 `ctrl+x 5`。

任务执行：

- 在首条 prompt 中说明 lane 目标、workspace 用途和注意事项。
- 如果任务依赖 `.env`、本地密钥、缓存或生成文件，在每个 worktree 中单独准备。
- 不要依赖 `copyChanges` 同步 `.gitignore` 忽略文件。
- 如果需要跨 workspace 移动改动，优先确认源 workspace 的 `git status`，再选择是否复制改动。

移出与合回：

- 从 workspace 回到 home 时，如果需要保留 workspace 改动，选择复制文件改动。
- 复制改动是 patch apply，不是完整目录同步。
- apply 失败时，不要强行删除 workspace；先在源 workspace 保留现场并手动处理冲突。
- patch 成功 apply 到 home 后，源 workspace 仍保留原本本地改动，需要后续清理或删除。

回收与维护：

- 一条 lane 完成后，确认改动已经合回、提交、stash 或不再需要，再删除 workspace。
- 不推荐长期复用旧 workspace 承接新任务。
- 删除 workspace 前确认没有仍需保留的 session 或未迁移文件。
- 如果 workspace 状态为 error 或目录不存在，优先用恢复流程把 session 移到新的 workspace，不要在未知状态下继续提交任务。

## 安全注意事项

- 删除 workspace 会删除它绑定的 sessions，也会删除 adapter 管理的目标。
- 对内置 worktree workspace 来说，删除 workspace 会通过 worktree service 删除 git worktree 目录。
- warp 时选择移动文件改动前，应确认目标 workspace 应该接收当前 diff。
- 如果 warp apply diff 失败，需要手动解决冲突，或改为不复制文件改动再 warp。
- workspace 功能仍是 experimental。删除 workspace 前，重要改动应先 commit、stash 或用其他方式备份。

## 代码参考

- TUI 命令：`packages/tui/src/app.tsx`
- Prompt workspace 流程：`packages/tui/src/component/prompt/workspace.tsx`
- Workspace selector 和 warp 流程：`packages/tui/src/component/dialog-workspace-create.tsx`
- Workspace 管理弹窗：`packages/tui/src/component/dialog-workspace-list.tsx`
- Workspace 状态展示：`packages/tui/src/component/workspace-label.tsx`
- TUI 快捷键：`packages/tui/src/config/keybind.ts`
- Workspace HttpApi：`packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts`
- Workspace handlers：`packages/opencode/src/server/routes/instance/httpapi/handlers/workspace.ts`
- Workspace service：`packages/opencode/src/control-plane/workspace.ts`
- 内置 worktree adapter：`packages/opencode/src/control-plane/adapters/worktree.ts`
- System environment 注入：`packages/opencode/src/session/system.ts`
- Session message path 记录：`packages/opencode/src/session/prompt.ts`
