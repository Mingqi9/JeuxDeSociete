# Vercel 部署说明

当前版本可部署为公开访问的网站，但仍是同一设备轮流操作的本地游戏。
不同电脑或浏览器不会共享对局；刷新页面会丢失当前游戏。

## 部署当前版本

1. 在 Vercel 新建项目，导入 `Mingqi9/JeuxDeSociete`。
2. 选择 `main` 分支，根目录保留仓库根目录。
3. 框架选择 Vite，Node.js 选择 22.x。
4. 安装命令为 `npm ci`，构建命令为 `npm run build`，输出目录为 `dist`。
5. 无需环境变量或密钥。点击 Deploy，完成后打开 Vercel 提供的链接。

仓库中的 `vercel.json` 已固定安装、构建和输出设置。关联 GitHub 后，后续推送可触发部署。
部署后请验证中文/法语切换、开始对局、卡牌和地图样式，以及触摸板缩放。

## 真正远程联机仍需实现

- 共享房间、邀请链接和 2–5 人大厅。
- 可信服务器执行规则，验证玩家身份、回合和支付。
- 每位玩家只接收自己的私有手牌与任务。
- 实时同步、并发保护、持久化、断线重连。
- 多浏览器、安全和恢复测试。

上传 GitHub 或部署静态前端不会自动实现以上功能。

参考：[Vercel 构建配置](https://vercel.com/docs/builds/configure-a-build)、[Vite 静态部署](https://vite.dev/guide/static-deploy)。
