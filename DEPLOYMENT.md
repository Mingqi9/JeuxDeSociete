# 本地联机与部署

M2 使用 Vercel 静态前端、独立 Node.js HTTP/WebSocket 服务器和 PostgreSQL。服务器执行规则，客户端只收到公共信息和自己的手牌、任务。当前没有创建云端服务；仅部署前端不能跨网络联机。

## 本地启动

安装 Node.js 22+，在仓库目录打开两个终端。第一个运行：

```sh
npm ci
npm run server
```

另一个运行：

```sh
npm run dev
```

打开 http://127.0.0.1:5173/?online=1 ，输入昵称创建房间，复制邀请链接，用另一个浏览器或无痕窗口加入。两个同源普通标签页共享座位凭证，不能用于模拟不同玩家。2–5 人可开始游戏。PowerShell 若禁止 npm.ps1，使用 npm.cmd。

没有 DATABASE_URL 时，开发服务器使用 PGlite（嵌入式 PostgreSQL），数据保存在 .local-data/postgres，重启服务不会主动清空房间。一个数据目录只能由一个开发服务器打开。生产环境强制使用独立 PostgreSQL，禁止这个开发回退。

本机链接只能在本机访问。远程朋友需要下面的线上部署；本轮不创建收费资源。

## 环境变量

可复制 .env.example 为 .env，只在本机填写；不要提交 .env 或数据库凭证。

| 变量                 | 设置位置    | 含义                                                            |
| -------------------- | ----------- | --------------------------------------------------------------- |
| DATABASE_URL         | Node 服务器 | PostgreSQL 连接字符串；生产必填，按数据库提供方配置 TLS         |
| ALLOWED_ORIGINS      | Node 服务器 | 前端 origin，逗号分隔，不带末尾斜杠；生产必须为 HTTPS           |
| HOST                 | Node 服务器 | 本地默认 127.0.0.1；容器/托管服务设 0.0.0.0                     |
| PORT                 | Node 服务器 | 默认 3001；托管平台可注入                                       |
| NODE_ENV             | Node 服务器 | 线上设 production                                               |
| LOCAL_DATABASE_DIR   | 本地 Node   | 开发数据目录，不用于生产                                        |
| VITE_GAME_SERVER_URL | Vercel 构建 | 后端 HTTPS 根地址，例如 https://rail-api.example.com ，不含 /ws |

本地不设置 VITE*GAME_SERVER_URL，Vite 将 /api 的 HTTP 和 WebSocket 请求代理到 127.0.0.1:3001。GAME_SERVER_TARGET 可覆盖开发代理地址。任何 VITE*\* 都会进入公开前端，不得放数据库密码或座位凭证。

## 以后上线的步骤

1. 准备 PostgreSQL 和支持长期运行 Node/WebSocket 的托管服务。先用一个 Node 实例；不要把此服务器作为短时函数部署。
2. 设置服务器 DATABASE_URL、NODE_ENV=production、HOST=0.0.0.0 和 ALLOWED_ORIGINS=https://你的前端域名。启动时自动创建 erc_rooms、erc_commands 和过期索引，数据库用户需具有对应建表权限。
3. 可用仓库 Dockerfile 构建运行；不用 Docker 时，构建命令为 `npm ci --include=dev && npm run typecheck && npm run build:server`，启动命令为 `npm run start:server`。运行目录需要 .server-build、package.json 和生产依赖。
4. 为服务器配置 HTTPS/WSS、WebSocket Upgrade 转发和 /health 健康检查。健康检查实际查询数据库；数据库不可用返回 503。代理空闲超时应大于 60 秒，服务每 20 秒发送心跳。服务休眠会中断对局连接，须验证恢复行为。
5. Vercel 导入 Mingqi9/JeuxDeSociete，框架 Vite，Node 22，安装 npm ci，构建 npm run build，输出 dist。设置 VITE_GAME_SERVER_URL 为后端 HTTPS 地址并重新构建。仓库已有 vercel.json。
6. 将最终 Vercel 域名加入服务器 ALLOWED_ORIGINS 并重启。预览部署域名也必须明确加入，否则会被拒绝。
7. 使用两个独立浏览器/设备验收创建、邀请、开始、任务选择、铺路/建站、轮次同步、刷新和断网恢复。重启后端后再次进入同一房间，确认对局恢复。检查手机布局和服务器日志，然后再分享链接。

## 数据与运维边界

- 座位凭证保存在对应浏览器的 localStorage；邀请 URL 不含凭证。刷新可恢复座位，清除浏览器数据或换设备不会自动取回原座位。目前没有账号或跨设备找回功能。
- 游戏开始后不允许新玩家加入或替换席位；大厅房主离线超过两分钟，其他玩家可接任。对局中断线者保留席位，没有自动代打或跳过回合。
- 房间七天无活动过期；清理房间时同时删除命令回执。服务器验证身份、回合、支付、命令版本和重复请求；事务提交后才广播。
- 生产数据库含完整游戏秘密。限制数据库访问，使用托管备份/恢复和容量监控；不要把数据库、请求凭证或 .local-data 放进公开仓库或日志。
- 当前限流按直接连接 IP 计算。反向代理后可能共享额度，需结合平台边缘限流验证；没有负载测试或大规模运维承诺。
- 已验证嵌入式 PostgreSQL 的事务与磁盘恢复，尚未实测托管 PostgreSQL、Docker 构建、TLS/反向代理或公网链路。部署后必须执行上述验收。
- 欧洲地图和任务仍保留既有候选数据标记，官方卡牌逐项审计状态见 DATA_SOURCES.md。

## 验证命令

```sh
npm test -- --testTimeout=20000
npm run build
npm run build:server
npm run test:e2e
npm run format:check
```

浏览器测试使用独立的 4173 前端、3002 后端和 .local-data/e2e 数据目录；需安装 Playwright Chromium，或设置 PW_BROWSER_PATH 指向 Chromium/Edge。不要在回归测试期间编辑前端源文件。
