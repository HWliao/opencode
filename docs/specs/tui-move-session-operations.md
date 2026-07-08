# TUI Move Session 功能说明与操作手册

## 范围

本文记录当前 TUI 中 `/move` 或 `session.move` 的真实实现、行为影响和操作方式。

本文只覆盖 Move session / project copy 这条链路，不覆盖旧的 experimental `/warp` workspace 绑定模型。旧 workspace 操作另见 `docs/specs/tui-workspaces-operations.md`。

## 一句话说明

`/move` 用来把 session 的工作目录切换到同一 project 下的另一个目录，必要时创建一个新的 git worktree project copy，并可选择把当前目录中的 Git 改动转移到目标目录。

它不是普通的 `cd`，也不是重命名 session。成功移动后，session 持久化记录中的 `directory` 和 `path` 会变化，后续 prompt、命令、文件检索和上下文都会以新目录为准。

## 代码入口

主要源码位置如下：

| 位置 | 作用 |
|---|---|
| `packages/tui/src/component/prompt/index.tsx` | 注册 prompt 命令 `session.move`，slash 名称是 `/move`。 |
| `packages/tui/src/component/prompt/move.tsx` | TUI move 主流程：打开选择对话框、创建 project copy、移动已有 session、提交新 session 目录。 |
| `packages/tui/src/component/dialog-move-session.tsx` | `Move session` 对话框：列出目录、创建、删除、刷新 project copies。 |
| `packages/tui/src/routes/home/session-destination.tsx` | Home prompt 中暂存新 session 的目标目录选择。 |
| `packages/core/src/control-plane/move-session.ts` | 后端 control-plane 移动 session、转移改动、发布移动事件。 |
| `packages/core/src/project/copy.ts` | project copy 创建、删除、刷新和目录登记。 |
| `packages/core/src/project/copy-strategies.ts` | 默认 `git_worktree` strategy。 |
| `packages/core/src/git.ts` | Git worktree 创建/删除和 patch 捕获、应用、清理。 |
| `packages/core/src/session/projector.ts` | 消费 `SessionEvent.Moved` 并更新 session 表。 |

## 与 `/warp` 的区别

| 对比项 | `/move` | `/warp` |
|---|---|---|
| 核心语义 | 切换当前 session 的工作目录。 | 切换当前 session 绑定的 experimental workspace。 |
| 目标对象 | project directory / project copy / subdirectory。 | experimental workspace。 |
| 作用范围 | 当前 session 的 `directory` 和 `path`。 | 当前 session 的 workspace 绑定。 |
| 是否能整体切到另一个 project | 不能；后端要求目标目录解析出的 project 等于当前 session 的 `projectID`。 | 不能；它是同一 project 内的 workspace 选择，不是项目切换器。 |
| 是否受 `OPENCODE_EXPERIMENTAL_WORKSPACES` 控制 | 否。 | 是。 |
| 创建目标 | 创建 `git_worktree` project copy。 | 创建 workspace adapter 管理的 workspace，目前内置 worktree workspace。 |
| session 字段变化 | 更新 `directory` 和 `path`，`workspace_id` 通常为空。 | 更新 `workspace_id`，并通过 workspace routing 影响工作目录上下文。 |
| 改动迁移 | 可选择把源目录 Git patch 转移到目标目录；成功后会清理源目录 scope 的未暂存和 untracked 改动。 | 可选择把源 workspace diff apply 到目标；不等同于清理源 workspace。 |
| 删除管理 | 在 Move dialog 中删除 project copy。 | 在 `/workspaces` 或 workspace 管理中删除 workspace。 |
| 模型感知 | TUI 会发送 synthetic reminder，提示工作目录已经变化。 | 默认主要通过当前 working directory、workspace root 和 Git 状态间接感知；不稳定暴露 workspace ID、名称或类型。 |

`/move` 和 `/warp` 可以同时存在，但它们管理的是不同层面的目标。不要把 `/move` 创建的 project copy 当作 `/warp` workspace 记录处理，也不要把 `/warp` workspace 当作普通 project directory copy 清理。

选择规则：

| 目标 | 推荐入口 |
|---|---|
| 同一 project 内，把当前 session 放到另一个目录、子目录或新 working copy | `/move` |
| 同一 project 内，把当前 session 放到 experimental workspace | `/warp` |
| 整体切换到另一个独立 project 或仓库 | 重新打开/启动那个项目，例如 `opencode <另一个项目目录>` |

## 用户入口

常用入口：

| 操作 | 入口 | 说明 |
|---|---|---|
| 打开 Move session | 在 prompt 输入 `/move` | 进入 `Move session` 对话框。 |
| 打开命令面板后搜索 | `session.move` 或 `Move session` | `session.move` 是内部命令名。 |
| 对话框中新建 project copy | `ctrl+m` | 选择 `new` 动作，目标为新 working copy。 |
| 对话框中删除 project copy | `ctrl+d` | 只允许删除由 strategy 登记的 project copy 根目录。 |
| 对话框中刷新列表 | `ctrl+r` | 重新扫描 project directories 和 git worktrees。 |

默认 keybind 中没有看到 `session.move` 的直接快捷键。它可以通过 slash 命令、命令面板或用户自定义 keybind 触发。

`/models` 额外配置了 slash alias `mo`，用于让 `/mo` 更偏向 `/models` 而不是 `/move`。

## 核心概念

### Project Directory

Project directory 是同一个 project 下可作为 session 工作目录的目录记录，来源是 `ProjectDirectories`。

记录字段包括：

| 字段 | 含义 |
|---|---|
| `directory` | 绝对目录路径。 |
| `strategy` | 如果存在，说明这是某种 project copy；当前默认 strategy 是 `git_worktree`。没有 strategy 的记录通常是项目主目录或普通根目录。 |

`/move` 只允许移动到同一 project 下的目录。后端会解析目标目录所属 project，如果目标 project 与 session 当前 `projectID` 不一致，会返回 `DestinationProjectMismatchError`。

### Project Copy

Project copy 是由 `ProjectCopy.Service` 管理的项目副本。当前内置实现只有 `git_worktree`。

创建流程：

1. TUI 调用 `experimental.projectCopy.generateName`，用当前任务上下文生成 2-3 个词的短名称。
2. TUI 调用 `v2.projectCopy.create`。
3. payload 中 strategy 固定为 `git_worktree`。
4. 目标父目录是 `<global data>/worktree/<projectID前6位>`。
5. 服务端在父目录下追加生成名，必要时追加 `-2` 到 `-10` 避免重名。
6. `git_worktree` strategy 执行 `git worktree add --detach <directory> HEAD`。
7. 创建成功后把新目录登记到 `ProjectDirectories`，strategy 为 `git_worktree`。

目录示例：

```text
<Global.Path.data>/worktree/<projectID前6位>/<generated-name>
```

TUI 中 `Global.Path.data` 对应 `global.data`，TUI provider 把 `paths.worktree` 设置为 `global.data + "/worktree"`。

### Subdirectory

对话框也会显示部分已知 subdirectory。它们不是独立 project copy，而是已有 session 的 `path` 派生出来的子目录。

特点：

| 行为 | 说明 |
|---|---|
| 可选择 | 可以把 session 移到已知子目录。 |
| 不可删除 | 删除动作对 subdirectory 禁用。 |
| 不会创建 worktree | 只更新 session 的 `directory` 和相对 `path`。 |

## 对话框数据来源

打开 `/move` 时，TUI 渲染 `DialogMoveSession`。

加载流程：

1. 先调用 `v2.projectCopy.refresh({ projectID, location })`。
2. 再调用 `project.directories({ projectID })`。
3. 当前所在目录优先显示为 `Current`。
4. 已登记根目录按当前目录、非 strategy 目录、strategy copy 目录排序。
5. 已有 session 的 subdirectory 会补充到对应根目录下面。

如果首次加载失败且没有旧数据，对话框显示 `Could not load project directories` 并锁定列表。如果刷新失败但已有列表可用，对话框保留已有列表继续可操作。

## 新 Session 使用 `/move`

适用于还在 Home prompt、尚未创建 session 的情况。

操作步骤：

1. 回到 Home prompt 或新 session prompt。
2. 输入 `/move`。
3. 在 `Move session` 对话框中选择已有目录，或按 `ctrl+m` 选择新 project copy。
4. 如果选择新 project copy，prompt 下方会显示 `(new working copy)`。
5. 输入任务 prompt 并提交。
6. 提交时 TUI 会先解析目标目录；如果需要创建新 copy，会先创建 copy，再调用 `session.create({ directory })`。

关键行为：

| 场景 | 行为 |
|---|---|
| 选择已有目录 | 只暂存目标目录，提交时把 `directory` 传给 `session.create`。 |
| 选择新 project copy | 提交时先生成名称、创建 git worktree，再创建 session。 |
| 创建 copy 失败 | 清空暂存目标，显示 `Creating workspace failed` toast，session 不会创建。 |
| copy 创建完成但 session 创建失败 | TUI 结束 move progress 并显示创建 session 失败。已创建的 project copy 不会自动删除。 |

## 已有 Session 使用 `/move`

适用于已经打开某个 session，想把它转到另一个目录或新 project copy。

操作步骤：

1. 打开目标 session。
2. 输入 `/move`。
3. 选择目标目录，或按 `ctrl+m` 新建 project copy。
4. 如果当前 session 目录存在 VCS 改动，TUI 会显示 `File Changes Found`。
5. 在提示中选择 `yes` 或 `no`。
6. 等待状态从 `Moving session` 结束。

选择含义：

| 选择 | 行为 |
|---|---|
| `yes` | `moveChanges: true`，尝试把当前 session 目录中的 Git 改动转移到目标目录。 |
| `no` | `moveChanges: false`，只移动 session 指针，不搬运文件改动。 |
| `esc` | 取消本次移动。 |

如果当前目录没有 VCS 改动，TUI 不弹出确认，等价于 `moveChanges: false`。

移动成功后，TUI 还会向当前 session 发送一条 `synthetic`、`noReply` 的 system reminder：

```text
<system-reminder>The user has changed the current working directory to "...". This is still the same project but at a possibly new location; take this into account when working with any files from now on.</system-reminder>
```

这条 reminder 的目的不是触发模型回复，而是让后续模型上下文知道工作目录已经变化。

## 后端移动实现

`experimental.controlPlane.moveSession` 的 payload 是：

```ts
{
  sessionID: string
  destination: { directory: string }
  moveChanges?: boolean
}
```

服务端流程：

1. 从 `SessionStore` 读取 session。
2. 如果 session 不存在，返回 `SessionV2.NotFoundError`。
3. 如果目标目录和当前 session 目录相同，直接 no-op。
4. 解析当前目录和目标目录所属 project。
5. 校验目标 project 必须等于 session 当前 `projectID`。
6. 只有在 `moveChanges` 为真，并且源 project 根目录与目标 project 根目录不同时，才捕获 Git patch。
7. 捕获源目录范围内的 tracked diff 和未被忽略的 untracked 文件。
8. 在目标目录所属 Git repo 中执行 `git apply -`。
9. apply 成功后发布 `SessionEvent.Moved`。
10. 如果曾捕获 patch，随后清理源目录范围内的改动。

`SessionEvent.Moved` 被 projector 消费后会更新：

| 字段 | 更新值 |
|---|---|
| `SessionTable.directory` | 目标目录绝对路径。 |
| `SessionTable.path` | 目标目录相对目标 project 根目录的相对路径。 |
| `SessionTable.workspace_id` | 事件 location 中的 workspaceID；`/move` 传的是 directory location，通常为空。 |
| `SessionTable.time_updated` | 移动事件时间。 |

projector 还会调用 `SessionContextEpoch.reset(...)`，让 session 后续上下文按新目录重新计算。

## 文件改动迁移边界

`moveChanges: true` 是 Git patch 迁移，不是目录复制。

捕获规则：

| 文件类型 | 是否迁移 | 说明 |
|---|---|---|
| tracked 修改 | 是 | 通过 `git diff --binary HEAD -- <scope>` 捕获。 |
| staged 修改 | 是 | 与 HEAD 的差异会被 patch 捕获。 |
| 未被忽略的 untracked 文件 | 是 | 通过 `git ls-files --others --exclude-standard` 和 `git diff --no-index /dev/null <file>` 转为 patch。 |
| `.gitignore` 忽略文件 | 否 | 不会出现在 `ls-files --others --exclude-standard`。 |
| Git patch 无法表达或无法 apply 的内容 | 否 | apply 失败会终止移动。 |

目标目录应用规则：

| 情况 | 行为 |
|---|---|
| 目标不是 Git repo | 返回 `ApplyChangesError`。 |
| patch apply 成功 | 发布移动事件，session 切换到目标目录。 |
| patch apply 失败 | 返回 `ApplyChangesError`，session 不移动，源目录不清理。 |

源目录清理规则：

| 内容 | 移动后源目录状态 |
|---|---|
| 未暂存 tracked 改动 | 通过 `git checkout -- <scope>` 恢复。 |
| untracked 文件 | 通过 `git clean -fd -- <scope>` 删除。 |
| staged index | 保留。实现传入 `index: "preserve"`。 |
| 当前 session 范围外的文件 | 保留。清理 scope 是 session 当前目录相对 Git worktree 的范围。 |

因此选择 `yes` 时，语义更接近“转移改动到目标目录，并清理源目录工作区”，不是“复制一份改动并保留源目录”。

## 同一 checkout 内移动

如果源目录和目标目录解析到同一个 project 根目录，后端不会捕获和应用 patch，即使 `moveChanges` 为真。

典型例子：

```text
源目录: /repo
目标目录: /repo/packages
```

这时 session 只会从根目录移动到 `packages` 子目录，源 checkout 中已有改动保持原样。

## Project Copy 删除

`Move session` 对话框内可以删除 project copy。

删除条件：

| 条件 | 是否可删 |
|---|---|
| 目录有 `strategy` | 可删。 |
| 普通项目根目录 | 不可删。 |
| subdirectory | 不可删。 |
| 正在删除其他目录 | 不可同时删除。 |

删除流程：

1. 用户选中可删除 copy 根目录。
2. 第一次按 `ctrl+d` 只进入确认态，提示再次按键确认。
3. 第二次按 `ctrl+d` 调用 `v2.projectCopy.remove({ force: false })`。
4. 服务端确认该目录是带 strategy 的 project copy。
5. `git_worktree` strategy 执行 `git worktree remove <directory>`。
6. 成功后从 `ProjectDirectories` 删除该目录记录。

如果 Git 返回 dirty worktree 错误，服务端会返回 `forceRequired: true`。TUI 随后读取该目录 VCS status，并展示 `Delete working copy?`。

| 选择 | 行为 |
|---|---|
| `yes` | 重新调用 `projectCopy.remove({ force: true })`，执行强制删除。 |
| `no` 或取消 | 保留 project copy，重新打开 Move dialog。 |

如果删除的是当前正在使用的 project copy：

| 当前界面 | 行为 |
|---|---|
| session route | 导航回 home，并关闭对话框。 |
| home prompt | 如果存在主目录 fallback，当前选择切回主目录。 |
| 无 fallback | 关闭对话框。 |

## Refresh 的作用

`projectCopy.refresh` 会同步数据库中的 project directory 记录和实际 Git worktree 状态。

具体行为：

1. 读取当前 project 已登记的 directories。
2. 检查已登记目录是否仍存在。
3. 对存在且没有 strategy 的源目录，调用每个 strategy 的 `list`。
4. 当前 `git_worktree` strategy 会执行 `git worktree list --porcelain`。
5. 发现的 main worktree 记录为普通 root，linked worktree 记录为 `git_worktree` copy。
6. 不存在的旧目录会从 `ProjectDirectories` 删除。
7. 发现或删除记录后发布 project directories updated 事件。

TUI 每次打开 Move dialog 都会先 refresh 一次；用户也可以在对话框中按 `ctrl+r` 手动刷新。

## 对 TUI 和会话列表的影响

移动成功后会影响以下行为：

| 影响面 | 说明 |
|---|---|
| 后续 prompt | 仍是同一个 session，但工作目录变为目标目录。 |
| shell / slash command | 后续执行按新 session directory 运行。 |
| 文件 mention 和查找 | 以新 location 解析文件路径。 |
| session list 过滤 | 如果启用了 `session_directory_filter_enabled`，session 可能从当前目录视图消失，并出现在目标目录视图。 |
| system context | session context epoch 被 reset，后续上下文会按新目录重新生成。 |
| 模型感知 | TUI 发送 synthetic reminder，提醒模型目录已变。 |
| 原目录文件 | 取决于是否选择搬运改动；选择 `yes` 会清理源目录范围内未暂存和 untracked 改动。 |

## 推荐操作流程

### 为新任务创建隔离工作目录

1. 在 Home prompt 输入 `/move`。
2. 按 `ctrl+m` 选择新 project copy。
3. 回到 prompt 后确认底部显示 `(new working copy)`。
4. 输入任务并提交。
5. 任务完成后在该 project copy 内检查 Git 状态。
6. 确认改动已合并、提交或迁出后，再通过 `/move` 对话框删除该 project copy。

### 把已有 session 移到新副本

1. 打开已有 session。
2. 输入 `/move`。
3. 按 `ctrl+m` 选择新 project copy。
4. 如果出现 `File Changes Found`，按需求选择是否移动改动。
5. 等待 `Moving session` 完成。
6. 继续在同一个 session 中工作。

选择建议：

| 情况 | 建议 |
|---|---|
| 当前目录有本任务未提交改动，并希望继续在新 copy 中处理 | 选择 `yes`。 |
| 当前目录改动属于其他任务或不确定来源 | 选择 `no`，先手动整理再移动。 |
| 当前目录存在 `.env`、缓存、依赖等 ignored 本地文件 | 不要依赖 `yes` 搬运，目标 copy 中需要单独准备。 |
| 源目录有 staged 改动 | 移动前先明确是否要保留 staged index；实现会保留源目录 staged 状态。 |

### 移到已有目录或子目录

1. 输入 `/move`。
2. 选择目标 root 或已知 subdirectory。
3. 如果是同一个 checkout 内的 root/subdirectory 切换，不会迁移或清理文件改动。
4. 如果是不同 worktree/copy 之间切换，按提示决定是否迁移改动。

### 删除旧 project copy

1. 输入 `/move`。
2. 选中旧 project copy 根目录。
3. 按 `ctrl+d`。
4. 再按一次 `ctrl+d` 确认。
5. 如果提示 dirty worktree，确认没有需要保留的改动后再选择 `yes` 强制删除。

删除前建议运行项目自己的检查命令或至少查看 Git 状态。强制删除会让 Git 移除 worktree，未保留改动会丢失。

## 风险和注意事项

| 风险 | 说明 | 建议 |
|---|---|---|
| 误以为 `yes` 会复制并保留源目录 | 实现会在移动成功后清理源目录 scope 的未暂存和 untracked 改动。 | 需要双份保留时，先手动 commit、stash 或复制。 |
| ignored 文件不会迁移 | `.env`、缓存、依赖目录等被 `.gitignore` 忽略的文件不会进入 patch。 | 在目标 copy 中重新准备本地环境。 |
| apply patch 冲突 | 目标目录基线不同或已有冲突时，`git apply -` 会失败。 | 先刷新/重建 copy，或手动迁移改动。 |
| staged 改动留在源目录 | 清理时使用 `index: "preserve"`。 | 移动前后都检查 `git status`。 |
| 新 copy 创建后 session 创建失败 | TUI 不会自动删除已创建 copy。 | 重新进入 `/move` 删除无用 copy。 |
| project copy 复用过久 | worktree 是独立 checkout，不会自动吸收主目录后续变化。 | 新任务优先创建新 copy，旧 copy 完成后回收。 |
| 跨 project 移动 | 后端禁止目标 project 与 session project 不一致。 | 需要跨项目工作时新建对应 project 的 session。 |

## 故障排查

### Move dialog 显示无法加载 project directories

可能原因：

| 原因 | 处理 |
|---|---|
| refresh 失败 | 关闭后重新打开 `/move`，或检查 Git worktree 状态。 |
| project directories 数据异常 | 使用 `ctrl+r` 刷新；仍失败时查看 TUI console/server log。 |
| 当前目录不再存在 | 从主项目目录重新启动 TUI，或恢复目录。 |

### 创建 project copy 失败

常见原因：

| 原因 | 表现 | 处理 |
|---|---|---|
| 源目录不是 Git repo | 后端无法 discover repository。 | 在 Git 仓库根目录或已登记项目目录中使用。 |
| 目标目录重名超过重试次数 | 返回 destination exists。 | 删除旧 copy 或调整 data/worktree 下冲突目录。 |
| Git worktree 创建失败 | toast 显示 `Creating workspace failed`。 | 查看 Git 错误，确认仓库状态和权限。 |

### 移动改动失败

常见原因：

| 原因 | 处理 |
|---|---|
| 源目录不是 Git repo | 不能捕获 patch，先手动整理改动。 |
| 目标目录不是 Git repo | 目标必须是同一 project 下的 Git checkout。 |
| patch apply 冲突 | session 不会移动；先手动处理目标目录基线，再重试。 |
| 源目录清理失败 | 移动事件可能已经发布；需要检查源目录 Git 状态和错误 toast/log。 |

### session 移动后在列表中找不到

如果 TUI 启用了 session directory filter，session 列表会按当前目录 scope 查询。移动后 session 会归属于目标目录，因此可能从源目录视图消失。

处理方式：

1. 切换到目标 project copy 或目标 subdirectory 对应视图。
2. 使用 session 列表搜索 session 标题。
3. 临时关闭 session directory filter，再查找 session。

## 维护建议

日常维护时按以下规则处理 project copies：

| 场景 | 建议 |
|---|---|
| 短期并行任务 | 每条任务创建独立 project copy。 |
| 任务完成 | 确认改动已提交、合并或迁回主目录后删除 copy。 |
| 长期未使用 copy | 先刷新列表，再删除不需要的 copy。 |
| copy 中有不确定改动 | 不要强制删除；先进入目录检查 Git 状态。 |
| 需要从旧 copy 继续 | 先确认它的 HEAD、未提交改动和与主目录的差异。 |

## 快速判断表

| 目标 | 推荐操作 |
|---|---|
| 新任务要隔离执行 | Home prompt `/move`，`ctrl+m` 新建 copy，再提交任务。 |
| 已有 session 要换到干净副本 | session 中 `/move`，`ctrl+m` 新建 copy，按需选择是否移动改动。 |
| 只想切到同 repo 子目录 | `/move` 选择已知 subdirectory；不会迁移 Git 改动。 |
| 想保留源目录改动并移动 session | 在改动提示中选择 `no`，或先手动 commit/stash。 |
| 想把改动转移到目标 copy | 在改动提示中选择 `yes`，移动后检查源和目标 Git 状态。 |
| 想清理旧 copy | `/move` 选中 copy，`ctrl+d` 两次；dirty 时谨慎选择强制删除。 |
