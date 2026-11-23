# 待办工作台（daiban）

带访问密码、可多人共享的待办清单。数据存放在 **Vercel Blob**（Vercel 第一方对象存储），由 Vercel 无服务器函数校验密码后读写。部署时不需要手动填写任何环境变量：创建 Blob Store 并连接到项目后，Vercel 会自动注入连接凭据。

## 功能

- 五种视图：全部待办 / 今天与逾期 / 进行中 / 已完成 / 高优先级
- 标签筛选、关键词搜索（标题、备注、标签）、三种排序方式
- 优先级、截止日期、备注与标签；逾期 / 今天到期 / 明天到期自动标识
- 图片附件：Ctrl/⌘ + V 粘贴、拖拽或选择文件；自动压缩，每条最多 12 张
- 图片灯箱预览与原图保存
- 完成统计与整体进度环
- JSON 备份导出与导入（按 `id` 合并，同 `id` 以备份文件为准）
- **访问密码**：首次打开设置密码，之后必须输入密码才能查看待办；密码以 scrypt 加盐哈希存在 Blob 中，服务端校验
- **跨浏览器 / 多人共享**：同一「协作空间」的所有设备看到同一份数据，15 秒轮询 + 页面重新可见时立即同步
- **离线回退**：网络不可用时继续使用本机缓存，恢复后自动重试保存
- 快捷键：`⌘/Ctrl + K` 搜索、`⌘/Ctrl + N` 新建、`⌘/Ctrl + Enter` 保存、`Esc` 关闭

## 目录结构

```
daiban/
├── index.html              # 页面结构（含访问密码门禁）
├── styles.css              # 全部样式
├── app.js                  # 应用逻辑（原生 JavaScript）
├── api/session.js          # 密码设置 / 校验
├── api/board.js            # 共享看板读写（需密码）
├── lib/blob-store.mjs      # Vercel Blob 读写与密码哈希
├── vercel.json             # Vercel 配置
├── package.json            # 仅 @vercel/blob 依赖
├── scripts/dev-server.mjs  # 零依赖本地静态服务器
└── README.md
```

## 部署到 Vercel

1. 打开 [Vercel](https://vercel.com/new)，用 GitHub 账号登录。
2. 导入仓库 `lwuyuec/daiban`。
3. Framework Preset：**Other**；Build Command / Output Directory / Install Command 保持默认，Vercel 会自动安装依赖。
4. 进入项目的 **Storage → Create Storage → Blob**，访问级别选 **Private**，创建后会自动连接到项目。
   - Vercel 自动注入 `BLOB_STORE_ID` 与 `VERCEL_OIDC_TOKEN`，**无需手动填写环境变量**。
5. 点击 **Deploy**。首次打开页面时设置访问密码即可。

> Vercel Blob 在所有套餐可用。Hobby 套餐有免费额度，适合个人/小团队待办看板。

## 改代码后自动更新线上

Vercel 通过 Git 集成自动部署：**只要把提交推送到 GitHub 的 `main` 分支，Vercel 就会自动构建并发布新版本**，无需手动操作控制台。

### 一次性确认（只需做一次）

1. Vercel 项目 → **Settings → Git**，确认 Connected Repository 是 `lwuyuec/daiban`。
2. 同页确认 **Production Branch** 为 `main`，且 **Auto-Deployments** 没有被关闭。
3. 如果导入 Vercel 时没有连接 Git，先到 **Settings → Git → Connect Git Repository** 连上同名仓库。

### 日常改代码流程

在 `D:\Projects\待办事项`（或任意 clone 了本仓库的目录）里改完代码后执行：

```bash
git add -A
git commit -m "说明这次改了什么"
git push origin main
```

推送成功后到 Vercel 项目首页的 **Deployments**，会看到一条新的 `Production` 部署记录（通常 1 分钟左右完成）。完成后浏览器强制刷新（`Ctrl + F5`）即可看到新版本。

### 注意事项

- 本地 `npm run dev` 只是本机预览，**不会**更新线上；必须 `git push origin main`。
- 推送到其它分支只会生成 Preview 预览部署，不会更新正式地址。
- 如果换设备改代码，先 `git pull origin main` 拉取最新提交再改，避免冲突。
- 待办数据存在 Vercel Blob 中，重新部署**不会**丢失数据。
- 如果 push 后 Vercel 没有反应：检查 Git 连接和分支名是否为 `main`，或在 Deployments 页面手动点 **Deploy** 排查。

## 本地运行

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

本地开发服务器只提供静态文件，不提供 `/api/*`。没有 Vercel 存储连接时，页面会进入本地模式，数据保存在浏览器 IndexedDB；要联调云端同步，请使用 Vercel 部署环境。

## 协作与分享

- 页面上方「协作空间」决定共享哪一份数据，默认是 `default`。
- 点击 **复制协作链接** 会带上当前空间与访问密码（URL 参数 `board` 与 `key`），对方打开即可直接进入同一看板。
- 不同空间的数据互不影响，可作为不同项目或团队看板。
- **修改密码**：解锁后点击左下角「修改访问密码」，输入当前密码与新密码即可；服务端会校验旧密码后更新哈希。修改成功后，之前复制的协作链接（含旧密码）会失效，需要重新点「复制协作链接」发给成员。
- **分享链接包含访问密码，请仅发给可信成员。**

## 安全边界

- 密码以 scrypt 加盐哈希存储在私有 Blob 中，前端不保存密码明文到 localStorage；仅在当前会话的 sessionStorage 中保留，关闭标签页后需重新输入。
- 所有数据接口在服务端校验密码，未解锁时无法读取或改写看板。
- 但静态页面资源本身是公开的；访问密码保护的是数据，不是网页文件。若需要企业级身份体系（账号、找回密码、细粒度权限），应接入真正的认证服务。
- 写入使用 Blob 的 ETag 条件写入（`ifMatch`）做并发控制；冲突时自动重试一次。策略为「整份看板最后写入生效」，两人同时修改不同条目时后提交者覆盖先提交者。

## 数据说明

- 浏览器 IndexedDB 是本地缓存；云端 Blob 是权威数据源，加载时以云端数据覆盖本地缓存。
- 清除浏览器数据不会丢失云端待办；重新打开协作链接即可恢复。
- 图片以压缩后的 Data URL 存入 JSON，单文件请求体上限约 4.5 MB；请勿把看板当图库使用。
- 建议定期使用「导出备份 (JSON)」留存快照。
