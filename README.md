# 待办工作台（daiban）

本地优先、可多人共享的待办清单。前端为纯静态资源，共享数据由 Vercel 无服务器函数写入 GitHub 仓库中的 JSON 文件；无构建步骤，可直接部署到 Vercel。

## 功能

- 五种视图：全部待办 / 今天与逾期 / 进行中 / 已完成 / 高优先级
- 标签筛选、关键词搜索（标题、备注、标签）、三种排序方式
- 优先级、截止日期、备注与标签；逾期 / 今天到期 / 明天到期自动标识
- 图片附件：Ctrl/⌘ + V 粘贴、拖拽或选择文件；自动压缩，每条最多 12 张
- 图片灯箱预览与原图保存
- 完成统计与整体进度环
- JSON 备份导出与导入（按 `id` 合并，同 `id` 以备份文件为准）
- **跨浏览器 / 多人共享**：同一「协作空间」内的所有设备看到同一份待办，15 秒轮询 + 页面重新可见时立即同步
- **离线回退**：网络不可用时继续使用本机数据，恢复后自动重试保存
- 快捷键：`⌘/Ctrl + K` 搜索、`⌘/Ctrl + N` 新建、`⌘/Ctrl + Enter` 保存、`Esc` 关闭

## 目录结构

```
daiban/
├── index.html              # 页面结构
├── styles.css              # 全部样式
├── app.js                  # 应用逻辑（原生 JavaScript）
├── api/board.js            # Vercel Serverless Function：共享看板读写
├── vercel.json             # Vercel 静态站点配置
├── package.json            # 仅提供本地开发脚本，无运行时依赖
├── scripts/dev-server.mjs  # 零依赖本地静态服务器（含 /api/board）
└── README.md
```

## 共享存储配置（跨浏览器 / 多人协同必需）

共享数据存放于 GitHub 仓库中的 `data/board-<协作空间>.json`。需要三个 Vercel 环境变量：

| 变量名 | 必填 | 说明 |
|---|---|---|
| `TODO_GITHUB_TOKEN` | 是 | 具备数据仓库 Contents 读写权限的 Personal Access Token（PAT） |
| `TODO_DATA_REPO` | 否 | 数据仓库，格式 `owner/repo`；默认 `lwuyuec/daiban` |
| `TODO_DATA_BRANCH` | 否 | 数据分支，默认 `main` |

**强烈建议新建专用私有仓库**（例如 `lwuyuec/daiban-data`）作为 `TODO_DATA_REPO`。原因：

1. 代码仓库通常是公开的，待办内容不应公开可见；
2. 数据写入代码仓库的 `main` 分支会触发 Vercel 重新部署，使用独立数据仓库可以避免这一问题。

PAT 权限：Fine-grained token 勾选目标仓库的 **Contents: read and write**；Classic token 勾选 `repo`。

### 本地开发

```bash
TODO_GITHUB_TOKEN=<你的PAT> TODO_DATA_REPO=lwuyuec/daiban-data npm run dev
# 打开 http://localhost:3000
```

未设置 `TODO_GITHUB_TOKEN` 时，页面自动进入「本地模式」，数据仅保存在浏览器，功能与改造前一致。

## 使用协作空间

- 页面上方「协作空间」输入框决定共享哪一份数据，默认是 `default`。
- 点击 **复制协作链接** 把当前空间链接发给其他人；对方打开后即可看到同一份待办。
- 不同空间的数据互不影响，可作为不同项目或不同团队看板。

## 冲突处理

- 写入使用 GitHub 文件 `sha` 做乐观并发控制；遇到并发写入（HTTP 409）时自动获取最新 `sha` 并重试一次。
- 同步策略为「整份看板最后写入生效」：单人顺序编辑无冲突，两人同时修改不同条目时后提交的版本会覆盖先提交的版本。若需细粒度合并（字段级/操作级），需要改为操作日志或 CRDT 方案。
- 图片以压缩后的 Data URL 存入 JSON，单文件上限约 10 MB；请勿把看板当图库使用。

## 部署到 Vercel

1. 打开 [Vercel](https://vercel.com/new)，使用 GitHub 账号登录。
2. 选择 **Add New → Project**，导入 `lwuyuec/daiban`。
3. 配置保持默认即可：
   - Framework Preset：**Other**
   - Root Directory：`./`
   - Build Command：留空（无需构建）
   - Output Directory：留空（默认根目录）
   - Install Command：留空（无依赖）
4. 在 **Environment Variables** 中添加上表的三个变量。
5. 点击 **Deploy**。后续推送到 `main` 会自动重新部署。

命令行方式（可选）：

```bash
npm i -g vercel
vercel --prod
```

## 数据说明

- 浏览器端以 IndexedDB 作为本地缓存（不可用时回退 localStorage），因此断网时仍可查看和编辑。
- 共享模式下，云端 JSON 是权威数据源；页面加载时以云端数据覆盖本地缓存。
- 清除浏览器数据不会丢失云端待办；重新打开协作链接即可恢复。
- 仍建议定期使用「导出备份 (JSON)」留存快照。
