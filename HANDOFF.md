# 换电脑继续开发

这是 Europa Rail Club 的完整源码交接说明，目标 GitHub 仓库为 `Mingqi9/JeuxDeSociete`。

## 新电脑启动

先安装 Git 和 Node.js 22 或更新版本。不要使用旧电脑 `/tmp/node-...` 的临时路径。

```sh
git clone https://github.com/Mingqi9/JeuxDeSociete.git
cd JeuxDeSociete
npm ci
npm run dev
```

私有仓库需要使用你自己的 GitHub 账号登录。浏览器打开终端打印的 Local 地址，通常是 `http://127.0.0.1:5173`。项目不需要环境密钥或付费服务。

## 继续交给 Codex

在新电脑用 VS Code/Codex 打开整个 `JeuxDeSociete` 文件夹。可直接告诉新的会话：

> 请先阅读 AGENTS.md、PRODUCT_REQUIREMENTS.md、DEVELOPMENT_PLAN.md、ART_DIRECTION.md、RULES_VERIFICATION.md 和 DATA_SOURCES.md，然后继续 Europa Rail Club 项目。我负责产品与 UX 反馈，你负责实现和测试。当前是本地轮流操作模式，不要把它描述为联网多人。完整地图是待最终核验的候选数据。

现有规则、设计方向、数据来源、已执行测试与未完成项均已记录在这些文件中，新会话不依赖聊天历史才能继续。

## 当前可用内容

- M0 已完成；M1 已实现可进行完整对局的本地规则引擎和双语 UI，但最终规则/数据核验门槛尚未完全关闭。
- 欧洲全图候选：47 个城市、101 条轨道、46 张任务；另保留原创小型训练图。
- 桌面中央地图与外围积分轨、玩家颜色及配件、左右牌区、秘密发牌与任务确认、端点预览及自动终局计分。
- 最近已执行：66 项单元/规则/数据测试通过，12 项桌面/手机浏览器测试通过，构建与格式检查通过。具体证据以 DEVELOPMENT_PLAN.md 为准。
- 最近的 DA 以用户提供的英中法规则书为参考，使用原创 SVG/CSS，不包含官方美术。设计说明见 ART_DIRECTION.md。

## 尚未实现 / 下次工作

- 远程房间、服务器权威校验、可靠身份与重连、持久化存档。
- 任务卡牌级最终核验，以及极端公开牌堆耗尽情形的权威规则确认。
- 进一步的真实移动设备、可访问性与地图可读性打磨。

所有游戏状态目前只在浏览器内存里；未上传运行中的对局或浏览器语言偏好。刷新、关闭或换电脑不能恢复旧对局。

## 验证命令

```sh
npm test
npm run build
npm run format:check
npx playwright install chromium
npm run test:e2e
```

浏览器测试会自行启动 4173 端口的开发服务器。安装 Chromium 是一次性本机准备步骤；没有浏览器时，先执行前面的规则测试与构建。

## 版本控制范围

应提交源码、测试、锁文件、配置、说明、数据核验快照和许可证。`node_modules/`、`dist/`、测试截图与追踪、覆盖率、`.env` 和系统临时文件已忽略，在新电脑重新生成。
