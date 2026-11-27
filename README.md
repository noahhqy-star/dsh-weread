# 微信读书 (WeRead)

在 DeepSeek Harness 里扫码登录微信读书，打开书架，在右侧栏分屏阅读。

## 功能

- **扫码登录**：点击左侧栏「自动化任务」下面的「微信读书」导航项（与「插件」「更多」同款紧凑小行），打开微信扫一扫，确认后即完成授权（令牌持久保存在本机）。若微信提示 4 位验证码，在面板内输入即可。
- **书架同步**：登录后展示微信读书书架，含封面、作者与阅读进度；按最近阅读排序，方便续读。
- **找书与导入**：默认关闭。启用后可按书名、作者或 ISBN 搜索 Z-Library，选中版本后导入微信读书。
- **继续阅读**：打开一本书会自动跳到上次的阅读进度（含章节内字符偏移），滚动/翻页/换章后回写进度到微信读书服务器。
- **静默续期**：`wr_skey` 过期时自动用 refreshToken 续期，不会莫名被踢回扫码页；网络抖动也不会误判为登出。
- **右侧栏阅读**：正文在右侧栏分屏显示，不影响主会话，阅读过程中可随时与助手对话。
- **目录导航**：章节内可打开目录快速跳转。

## 使用方法

1. 点击左侧栏「自动化任务」下面的「微信读书」导航项。
2. 用微信扫描二维码并确认；若微信提示 4 位验证码，在面板内输入。
3. 书架出现后点击任意书籍，右侧栏即打开阅读器，并自动跳到上次进度。
4. 阅读时主会话区不受影响，仍可正常与智能体对话；阅读器右上角「书架」可返回列表，「目录」可跳章。

## 找书与导入

在书架打开「找书设置」，勾选「启用找书」，然后在面板内完成以下操作。

1. **安装 zlib。** 已装好的 zlib 可以直接使用。首次安装时，插件从 [zlib 官方发布页](https://github.com/heartleo/zlib/releases/tag/v0.0.15) 下载并校验，支持 macOS、Windows 和 Linux 的 x64 与 ARM64，安装到当前用户目录。
2. **登录 Z-Library。** 点击「检测可用域名」，选择可达的域名，再输入自己的邮箱和密码。登录会话保存在 Harness 主机上的 zlib 配置中。
3. **绑定微信读书。** 如果还要从搜索结果导入，请用当前书架对应的微信账号扫描绑定二维码。只搜索可以跳过这一步。

搜索结果支持 EPUB、PDF、MOBI、AZW3 和 TXT，请选取你有权使用的电子书。导入后插件会刷新书架。关闭找书会隐藏搜索入口，书架和阅读仍可使用。

## 安装

在 Harness 的插件管理里添加以下 GitHub 地址，或在终端运行命令。将 `desktop` 替换为你正在使用的 profile，例如 `web`。

```sh
dsh plugin --profile desktop add github:noahhqy-star/dsh-weread#v1.0.0
```

也可以在 [GitHub Releases](https://github.com/noahhqy-star/dsh-weread/releases) 下载 `weread-1.0.0.tgz`，用 `dsh plugin --profile desktop add ./weread-1.0.0.tgz` 安装。

需要使用 DeepSeek Harness 0.2.2-rc.2 或更高版本。独立运行 DSH CLI 时，需 Node.js 22 或更高版本。

## 说明与限制

- 书架和阅读请求发往微信读书。启用找书后，关键词发往配置的 Z-Library 域名，导入请求发往微信读书。
- 二维码在约 5 分钟内保持可扫（长轮询每 ~55 秒返回一个窗口超时，不代表二维码失效）；确已失效时点击「刷新二维码」。
- 阅读位置由微信读书服务器记录，本插件不在本地另行保存。

---

Sign in to WeRead with a WeChat QR code, browse your bookshelf, and read chapters in the split right-side panel — without interrupting your conversation. Reading progress is kept in sync with WeRead.
