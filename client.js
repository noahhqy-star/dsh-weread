// 微信读书 (WeRead) — Web client plugin.
// Registers a sidebar footer entry, a home tab (QR login + bookshelf), and a
// reader resource tab that renders chapters in the right sidebar.
(function (global) {
  const CHANNEL = '/weread';
  const NS = 'weread';
  const SHELF_VIEW_KEY = 'weread.shelf-view';
  const READER_THEME_KEY = 'weread.reader-theme';
  const POPULAR_BATCH_SIZE = 12;

  global.__ModuleLoader__.load({
    id: '@quinn_hoo/weread',
    factory(require) {
      const React = require('react');
      const h = React.createElement;

      // ---------------------------------------------------------------------
      // Locale dictionaries (runtime UI strings)
      // ---------------------------------------------------------------------
      const ZH = {
        entry: '微信读书',
        'entry.tip': '微信读书',
        'home.title': '微信读书',
        'home.loggedOut': '扫码登录微信读书',
        'home.scanHint': '打开微信扫码，确认后即可同步书架与阅读进度',
        'home.refresh': '刷新二维码',
        'home.expired': '二维码已过期，请点击刷新',
        'home.waiting': '等待扫码…',
        'home.otpHint': '请在微信中输入手机上显示的 4 位验证码',
        'home.otpPlaceholder': '4 位数字',
        'home.otpConfirm': '确认验证码',
        'home.otpWrong': '验证码不正确，请重新输入',
        'home.openInBrowser': '在浏览器中打开',
        'home.loading': '正在加载…',
        'home.logout': '退出登录',
        'home.retry': '重试',
        'home.loadFailed': '加载失败',
        'home.empty': '书架为空，去微信读书添加几本书吧',
        'home.progress': '进度',
        'shelf.refresh': '刷新书架',
        'shelf.view': '书架视图',
        'shelf.grid': '封面',
        'shelf.list': '列表',
        'zlib.title': '找书',
        'zlib.setupTitle': "找书设置",
        'zlib.setupDescription': "开启后可在 Z-Library 找书。你可以随时关闭。",
        'zlib.setupEnable': "启用找书",
        'zlib.setupDisabled': "找书已关闭。",
        'zlib.setupUnavailable': "无法读取或保存找书设置，请重试。",
        'zlib.setupBusy': "正在处理另一项设置，请稍后重试。",
        'zlib.setupInstallTitle': "安装 zlib",
        'zlib.setupInstallHint': "从 zlib 的 GitHub 发布页下载并校验，安装到当前用户目录。",
        'zlib.setupInstallAction': "下载并安装",
        'zlib.setupInstalling': "正在下载并安装 zlib…",
        'zlib.setupInstalled': "已安装",
        'zlib.setupUnsupported': "此系统或架构暂不支持插件内安装。可手动安装 zlib 后重新打开设置。",
        'zlib.setupInstallFailed': "安装失败，请检查 Harness 能否访问 GitHub，然后重试。",
        'zlib.setupLoginTitle': "登录 Z-Library",
        'zlib.setupAwaitInstall': "安装 zlib 后继续。",
        'zlib.setupLoginHint': "先检测可用域名，再用你的 Z-Library 账号登录。",
        'zlib.setupFindDomain': "检测可用域名",
        'zlib.setupCheckingDomains': "正在检测 Z-Library 域名…",
        'zlib.setupNoDomains': "当前网络未找到可用于登录的域名。切换网络后重试。",
        'zlib.setupDomainsFailed': "无法连接 Z-Library，请检查 Harness 主机的网络后重试。",
        'zlib.setupDomain': "登录域名",
        'zlib.setupEmail': "邮箱",
        'zlib.setupPassword': "密码",
        'zlib.setupShowPassword': "显示密码",
        'zlib.setupSignIn': "登录",
        'zlib.setupSigningIn': "正在登录 Z-Library…",
        'zlib.setupInvalidLogin': "请选择可用域名并填写邮箱和密码。",
        'zlib.setupLoginFailed': "登录失败，请检查邮箱、密码或换一个域名。",
        'zlib.setupSignedIn': "已找到 Z-Library 登录会话。",
        'zlib.setupRelogin': "重新登录 Z-Library",
        'zlib.setupLinkTitle': "绑定微信读书（导入时需要）",
        'zlib.setupLinkHint': "用当前书架对应的微信账号扫码。只找书可以跳过。",
        'zlib.setupAwaitLogin': "登录 Z-Library 后可绑定。",
        'zlib.setupScanAction': "显示绑定二维码",
        'zlib.setupRelink': '重新绑定',
        'zlib.setupStartingScan': "正在获取绑定二维码…",
        'zlib.setupQrAlt': "微信读书导入绑定二维码",
        'zlib.setupScanned': "扫码成功，请在手机上确认。",
        'zlib.setupQrFailed': "二维码已失效或绑定失败，请重新扫码。",
        'zlib.setupLinked': "导入账号与当前书架一致。",
        'zlib.setupCancel': "取消扫码",
        'zlib.setupOpenSearch': "开始找书",
        'zlib.label': '搜索 Z-Library',
        'zlib.placeholder': '书名、作者或 ISBN',
        'zlib.submit': '搜索',
        'zlib.order': '排序',
        'zlib.order.bestmatch': '相关度',
        'zlib.order.popular': '热门',
        'zlib.order.rating': '评分',
        'zlib.rating': '评分',
        'zlib.epubOnly': '仅看 EPUB',
        'zlib.formatReload': '重启 Harness 后即可按格式筛选。',
        'zlib.popular': 'Z-Library 热门书籍',
        'zlib.popularLanguage': '热门书籍语言',
        'zlib.popularAll': '全部',
        'zlib.popularChinese': '中文',
        'zlib.popularNextBatch': '换一批',
        'zlib.popularEmpty': '暂无热门书籍。',
        'zlib.popularFailed': '热门书籍加载失败，请稍后重试。',
        'zlib.popularReload': '重启 Harness 后即可加载中文热门书籍。',
        'zlib.prev': '上一页',
        'zlib.next': '下一页',
        'zlib.searching': '正在搜索…',
        'zlib.empty': '没有找到可导入的书籍。试试其他书名、作者或 ISBN。',
        'zlib.add': '导入书架',
        'zlib.adding': '正在下载并导入…',
        'zlib.added': '已导入微信读书',
        'zlib.existed': '微信读书已有这份文件',
        'zlib.shelfPending': '书架还未显示这本书，可稍后刷新。',
        'zlib.done': '已导入',
        'zlib.duplicate': '已存在',
        'zlib.install': '未找到 zlib，请在找书设置中安装。',
        'zlib.login': '请在找书设置中登录 Z-Library。',
        'zlib.wereadLogin': '请在找书设置中绑定当前书架对应的微信账号。',
        'zlib.pluginLogin': '请先登录插件中的微信读书，再导入。',
        'zlib.accountMismatch': '导入账号与当前书架不同，请用同一个微信账号重新扫码。',
        'zlib.searchFailed': '搜索失败，请检查 Z-Library 域名和网络后重试。',
        'zlib.accountFailed': '无法核对微信读书登录，请检查网络后重试。',
        'zlib.importFailed': '导入失败，请检查微信读书书架及 zlib 的网络设置。',
        'zlib.importTimeout': '微信读书尚未确认导入，请先检查书架再重试。',
        'zlib.timeout': '请求超时，请检查网络后重试。',
        'zlib.verify': '微信读书要求在手机 App 内完成验证。',
        'zlib.importLimit': '已达到微信读书的导入上限。',
        'zlib.downloadLimit': '已达到 Z-Library 的下载上限。',
        'zlib.response': 'zlib 返回了无法识别的数据，请检查 CLI 版本。',
        'zlib.invalidSearch': '请输入 200 字以内的关键词。',
        'zlib.invalidBook': '书籍 ID 无效，请重新搜索。',
        'zlib.busy': '已有一本书正在导入，请稍后再试。',
        'reader.title': '微信读书',
        'reader.shelf': '书架',
        'reader.backToShelf': '返回书架',
        'reader.catalog': '目录',
        'reader.themeAction': '主题',
        'reader.theme': '阅读主题',
        'reader.theme.light': '浅色',
        'reader.theme.dark': '深色',
        'reader.theme.paper': '纸书',
        'reader.prev': '上一章',
        'reader.next': '下一章',
        'reader.chapterNavigation': '章节导航',
        'reader.sourcePage': '原书页码',
        'reader.sourcePageBreak': '原书分页',
        'reader.progressEstimate': '按章节字数和当前阅读位置估算整本书进度',
        'reader.loading': '正在加载章节…',
        'reader.loadFailed': '章节加载失败',
        'reader.noBook': '缺少书籍信息，请从书架重新打开',
        'reader.noCatalog': '未获取到目录',
        'reader.noContent': '本章暂无内容',
        'reader.toc': '目录',
      };

      const EN = {
        entry: 'WeRead',
        'entry.tip': 'WeRead',
        'home.title': 'WeRead',
        'home.loggedOut': 'Sign in to WeRead',
        'home.scanHint': 'Scan with WeChat to sync your bookshelf and progress',
        'home.refresh': 'Refresh QR code',
        'home.expired': 'QR code expired, tap refresh',
        'home.waiting': 'Waiting for scan…',
        'home.otpHint': 'Enter the 4-digit code shown on your phone in WeChat',
        'home.otpPlaceholder': '4 digits',
        'home.otpConfirm': 'Confirm code',
        'home.otpWrong': 'Incorrect code, please try again',
        'home.openInBrowser': 'Open in browser',
        'home.loading': 'Loading…',
        'home.logout': 'Sign out',
        'home.retry': 'Retry',
        'home.loadFailed': 'Failed to load',
        'home.empty': 'Your bookshelf is empty',
        'home.progress': 'Progress',
        'shelf.refresh': 'Refresh shelf',
        'shelf.view': 'Shelf view',
        'shelf.grid': 'Covers',
        'shelf.list': 'List',
        'zlib.title': 'Find books',
        'zlib.setupTitle': "Book search settings",
        'zlib.setupDescription': "Enable this feature to search Z-Library. You can turn it off at any time.",
        'zlib.setupEnable': "Enable book search",
        'zlib.setupDisabled': "Book search is off.",
        'zlib.setupUnavailable': "Could not load or save book search settings. Try again.",
        'zlib.setupBusy': "Another setup action is running. Try again shortly.",
        'zlib.setupInstallTitle': "Install zlib",
        'zlib.setupInstallHint': "Download and verify the zlib release from GitHub, then install it in your user directory.",
        'zlib.setupInstallAction': "Download and install",
        'zlib.setupInstalling': "Downloading and installing zlib…",
        'zlib.setupInstalled': "Installed",
        'zlib.setupUnsupported': "In-plugin installation is unavailable on this system. Install zlib manually, then reopen settings.",
        'zlib.setupInstallFailed': "Installation failed. Check whether Harness can reach GitHub, then try again.",
        'zlib.setupLoginTitle': "Sign in to Z-Library",
        'zlib.setupAwaitInstall': "Install zlib to continue.",
        'zlib.setupLoginHint': "Check which domains are reachable, then sign in with your Z-Library account.",
        'zlib.setupFindDomain': "Check available domains",
        'zlib.setupCheckingDomains': "Checking Z-Library domains…",
        'zlib.setupNoDomains': "No supported sign-in domain was found. Try again on another network.",
        'zlib.setupDomainsFailed': "Could not reach Z-Library. Check the Harness host’s network and try again.",
        'zlib.setupDomain': "Sign-in domain",
        'zlib.setupEmail': "Email",
        'zlib.setupPassword': "Password",
        'zlib.setupShowPassword': "Show password",
        'zlib.setupSignIn': "Sign in",
        'zlib.setupSigningIn': "Signing in to Z-Library…",
        'zlib.setupInvalidLogin': "Select a reachable domain and enter your email and password.",
        'zlib.setupLoginFailed': "Sign-in failed. Check your email and password or try another domain.",
        'zlib.setupSignedIn': "Z-Library session found.",
        'zlib.setupRelogin': "Sign in to Z-Library again",
        'zlib.setupLinkTitle': "Link WeRead for imports",
        'zlib.setupLinkHint': "Scan with the WeChat account for this bookshelf. Skip this step if you only want to search.",
        'zlib.setupAwaitLogin': "Sign in to Z-Library before linking WeRead.",
        'zlib.setupScanAction': "Show QR code",
        'zlib.setupRelink': 'Link again',
        'zlib.setupStartingScan': "Getting the linking QR code…",
        'zlib.setupQrAlt': "QR code for linking WeRead imports",
        'zlib.setupScanned': "Code scanned. Confirm on your phone.",
        'zlib.setupQrFailed': "The code expired or linking failed. Scan a new code and try again.",
        'zlib.setupLinked': "The import account matches this bookshelf.",
        'zlib.setupCancel': "Cancel linking",
        'zlib.setupOpenSearch': "Start searching",
        'zlib.label': 'Search Z-Library',
        'zlib.placeholder': 'Title, author or ISBN',
        'zlib.submit': 'Search',
        'zlib.order': 'Sort by',
        'zlib.order.bestmatch': 'Relevance',
        'zlib.order.popular': 'Popularity',
        'zlib.order.rating': 'Rating',
        'zlib.rating': 'Rating',
        'zlib.epubOnly': 'Show EPUB only',
        'zlib.formatReload': 'Restart Harness to filter results by file format.',
        'zlib.popular': 'Popular on Z-Library',
        'zlib.popularLanguage': 'Popular books language',
        'zlib.popularAll': 'All',
        'zlib.popularChinese': 'Chinese',
        'zlib.popularNextBatch': 'Next batch',
        'zlib.popularEmpty': 'No popular books available yet.',
        'zlib.popularFailed': 'Could not load popular books. Try again.',
        'zlib.popularReload': 'Restart Harness to load popular Chinese books.',
        'zlib.prev': 'Previous page',
        'zlib.next': 'Next page',
        'zlib.searching': 'Searching…',
        'zlib.empty': 'No importable books found. Try another title, author or ISBN.',
        'zlib.add': 'Import to shelf',
        'zlib.adding': 'Downloading and importing…',
        'zlib.added': 'Imported to WeRead',
        'zlib.existed': 'WeRead already has this file',
        'zlib.shelfPending': 'The book is not visible on the shelf yet. Refresh the shelf later.',
        'zlib.done': 'Imported',
        'zlib.duplicate': 'Already exists',
        'zlib.install': 'zlib was not found. Install it in Book search settings.',
        'zlib.login': 'Sign in to Z-Library in Book search settings.',
        'zlib.wereadLogin': 'Link the WeChat account for this bookshelf in Book search settings.',
        'zlib.pluginLogin': 'Sign in to WeRead in this plugin before importing.',
        'zlib.accountMismatch': 'The import account differs from this bookshelf. Scan again with the same WeChat account.',
        'zlib.searchFailed': 'Search failed. Check your Z-Library domain and connection, then try again.',
        'zlib.accountFailed': 'Could not verify your WeRead sign-in. Check your connection and try again.',
        'zlib.importFailed': 'Import failed. Check your WeRead shelf and zlib network settings.',
        'zlib.importTimeout': 'WeRead has not confirmed the import. Check your shelf before trying again.',
        'zlib.timeout': 'The request timed out. Check your connection and try again.',
        'zlib.verify': 'WeRead requires verification in the mobile app.',
        'zlib.importLimit': 'The WeRead import limit has been reached.',
        'zlib.downloadLimit': 'The Z-Library download limit has been reached.',
        'zlib.response': 'zlib returned unreadable data. Check your CLI version.',
        'zlib.invalidSearch': 'Enter up to 200 characters to search.',
        'zlib.invalidBook': 'The book ID is invalid. Search again.',
        'zlib.busy': 'Another book is being imported. Try again in a moment.',
        'reader.title': 'WeRead',
        'reader.shelf': 'Shelf',
        'reader.backToShelf': 'Back to shelf',
        'reader.catalog': 'Chapters',
        'reader.themeAction': 'Theme',
        'reader.theme': 'Reading theme',
        'reader.theme.light': 'Light',
        'reader.theme.dark': 'Dark',
        'reader.theme.paper': 'Paper',
        'reader.prev': 'Prev',
        'reader.next': 'Next',
        'reader.chapterNavigation': 'Chapter navigation',
        'reader.sourcePage': 'Source page',
        'reader.sourcePageBreak': 'Source page break',
        'reader.progressEstimate': 'Book progress estimated from chapter word counts and reading position',
        'reader.loading': 'Loading chapter…',
        'reader.loadFailed': 'Failed to load chapter',
        'reader.noBook': 'Missing book info, reopen from the shelf',
        'reader.noCatalog': 'No chapters found',
        'reader.noContent': 'This chapter is empty',
        'reader.toc': 'Chapters',
      };

      // ---------------------------------------------------------------------
      // Small helpers
      // ---------------------------------------------------------------------
      const READER_THEMES = ['light', 'dark', 'paper'];
      const readerThemeListeners = new Set();
      let readerTheme = 'light';
      try {
        const savedTheme = global.localStorage.getItem(READER_THEME_KEY);
        if (READER_THEMES.includes(savedTheme)) readerTheme = savedTheme;
      } catch {}

      function applyReaderTheme(value) {
        readerTheme = READER_THEMES.includes(value) ? value : 'light';
        readerThemeListeners.forEach((notify) => notify());
      }

      function subscribeReaderTheme(notify) {
        readerThemeListeners.add(notify);
        return () => { readerThemeListeners.delete(notify); };
      }

      function getReaderTheme() {
        return readerTheme;
      }

      function saveReaderTheme(value) {
        applyReaderTheme(value);
        try { global.localStorage.setItem(READER_THEME_KEY, value); } catch {}
      }

      const READING_CSS = `
        [data-weread-reader] {
          color-scheme: only light;
          --dsw-alias-bg-layer-1: #fcfcfb;
          --dsw-alias-label-primary: #222220;
          --dsw-alias-label-tertiary: #62625c;
          --dsw-alias-border-l2: #ddddd7;
          --weread-toolbar: #f5f5f1;
          --weread-highlight: #e9e9e3;
          --weread-choice-selected-bg: var(--dsw-alias-label-primary);
          --weread-choice-selected-ink: var(--dsw-alias-bg-layer-1);
          background-color: var(--dsw-alias-bg-layer-1);
          color: var(--dsw-alias-label-primary);
        }
        [data-weread-reader="light"] {
          --weread-action-ink: var(--dsw-alias-label-secondary, var(--dsw-alias-label-tertiary));
          --weread-action-hover: var(--dsw-alias-interactive-bg-hover, var(--weread-highlight));
        }
        [data-weread-reader="dark"] {
          color-scheme: only dark;
          --dsw-alias-bg-layer-1: #1c1d20;
          --dsw-alias-label-primary: #e3e1db;
          --dsw-alias-label-tertiary: #aaa8a2;
          --dsw-alias-border-l2: #414248;
          --weread-toolbar: #242529;
          --weread-highlight: #36383e;
        }
        [data-weread-reader="paper"] {
          --dsw-alias-bg-layer-1: #f7efde;
          --dsw-alias-label-primary: #3d3025;
          --dsw-alias-label-tertiary: #6e5945;
          --dsw-alias-border-l2: #d8c8ae;
          --weread-toolbar: #efe4cf;
          --weread-highlight: #e8dac0;
        }
        [data-weread-reader] :focus-visible {
          outline: 2px solid var(--dsw-alias-label-primary);
          outline-offset: 2px;
        }
        .weread-reader-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-block-size: 32px;
          padding-inline: 8px;
          border: 0;
          border-radius: var(--dsw-radius-sm, 6px);
          background: transparent;
          color: var(--weread-action-ink, var(--dsw-alias-label-tertiary));
          font: inherit;
          font-size: 12px;
          white-space: nowrap;
          cursor: pointer;
        }
        .weread-reader-action:hover:not(:disabled),
        .weread-reader-theme[open] > summary {
          background: var(--weread-action-hover, var(--weread-highlight));
          color: var(--dsw-alias-label-primary);
        }
        .weread-reader-action--icon { inline-size: 34px; padding-inline: 0; }
        .weread-reader-theme { position: relative; }
        .weread-reader-theme > summary { list-style: none; }
        .weread-reader-theme > summary::-webkit-details-marker { display: none; }
        .weread-reader-theme-options {
          position: absolute;
          z-index: 6;
          inset-block-start: calc(100% + 6px);
          inset-inline-end: 0;
          inline-size: max-content;
          padding: 5px;
          border: 1px solid var(--dsw-alias-border-l2);
          border-radius: 10px;
          background: var(--dsw-alias-bg-layer-1);
          box-shadow: 0 4px 14px rgba(0,0,0,.14);
        }
        .weread-reader-chapter-nav {
          position: absolute;
          z-index: 2;
          inset-inline: 12px;
          inset-block-end: 14px;
          inline-size: max-content;
          min-inline-size: min(216px, calc(100% - 24px));
          max-inline-size: calc(100% - 24px);
          margin-inline: auto;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 4px 5px;
          border: 1px solid var(--dsw-alias-border-l2);
          border-radius: 999px;
          background: var(--dsw-alias-bg-layer-1);
          box-shadow: 0 5px 18px rgba(0,0,0,.16), 0 1px 3px rgba(0,0,0,.08);
        }
        .weread-reader-chapter-nav .weread-reader-action {
          padding-inline: 11px;
          border-radius: 999px;
        }
        [data-weread-content] {
          box-sizing: content-box;
          max-inline-size: 38em;
          margin-inline: auto;
          padding: 1.5rem clamp(.875rem, 4%, 1.75rem) 4.5rem;
          font-family: Georgia, "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", SimSun, serif;
          font-size: 1.0625rem;
          line-height: 1.9;
          color: var(--dsw-alias-label-primary, CanvasText);
          text-align: start;
          overflow-wrap: anywhere;
        }
        [data-weread-content] :where(p, blockquote, ul, ol, dl, pre, table, figure) {
          margin-block: 0 .85em;
        }
        [data-weread-content] :where(h1, h2, h3, h4, h5, h6, [data-weread-chapter-heading]) {
          margin: 1.35em 0 .65em;
          font-size: 1.17em;
          line-height: 1.4;
          font-weight: 700;
          text-wrap: balance;
        }
        [data-weread-content] :where(h1, [data-weread-chapter-heading]) { font-size: 1.55em; }
        [data-weread-content] h2:not([data-weread-chapter-heading]) { font-size: 1.32em; }
        [data-weread-content] :where(h1, h2, h3, [data-weread-chapter-heading]):first-child { margin-block-start: 0; }
        [data-weread-content] :where(p, div, li, blockquote, center) { text-align: start; text-indent: 0; }
        [data-weread-content] :where(big, small) { font-size: inherit; }
        [data-weread-content] :where(ul, ol) { padding-inline-start: 1.5em; }
        [data-weread-content] blockquote {
          margin-inline: 0;
          padding-inline-start: .9em;
          border-inline-start: 2px solid var(--dsw-alias-border-l2, GrayText);
        }
        [data-weread-content] :where(img, svg) { max-inline-size: 100%; block-size: auto; }
        [data-weread-content] figure { margin-inline: 0; }
        [data-weread-content] figcaption { font-size: .88em; line-height: 1.6; }
        [data-weread-content] :where(sup, sub) { font-size: .75em; line-height: 0; }
        [data-weread-content] a[href] { color: inherit; text-decoration: underline; }
        [data-weread-content] pre { overflow-x: auto; }
        [data-weread-content] table { max-inline-size: 100%; border-collapse: collapse; }
        [data-weread-content] :where(th, td) {
          padding: .25em .55em;
          border-bottom: 1px solid var(--dsw-alias-border-l2, GrayText);
        }
        [data-weread-content] [data-weread-page-break] {
          display: flex;
          align-items: center;
          gap: .75rem;
          margin-block: 1.25rem;
          color: var(--dsw-alias-label-tertiary, GrayText);
          font: 500 .75rem/1.5 system-ui, sans-serif;
          text-align: center;
        }
        [data-weread-content] [data-weread-page-break]::before,
        [data-weread-content] [data-weread-page-break]::after {
          content: '';
          flex: 1;
          border-block-start: 1px solid var(--dsw-alias-border-l2, GrayText);
        }
        [data-weread-content][data-weread-txt] p { white-space: pre-wrap; }
      `;

      // 全局按钮交互态（hover / active / disabled / focus-visible）。
      // 按钮主体仍用 React 内联样式；hover 态用这些命名空间 class 覆盖，
      // 背景/边框需要 !important，因为内联样式优先级高于普通选择器。
      const BUTTON_CSS = `
        .weread-btn {
          transition: background-color .15s ease, color .15s ease, border-color .15s ease,
            box-shadow .15s ease, filter .15s ease, opacity .15s ease, transform .12s ease;
        }
        .weread-btn:focus-visible {
          outline: 2px solid var(--dsw-alias-label-primary, CanvasText);
          outline-offset: 2px;
        }
        .weread-btn:disabled { cursor: default; opacity: .5; }
        .weread-btn:active:not(:disabled) { transform: translateY(1px); }

        /* 幽灵 / 描边按钮：hover 淡色背景 + 边框加深 */
        .weread-btn--ghost:hover:not(:disabled) {
          background-color: var(--weread-action-hover, var(--weread-highlight, var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.14)))) !important;
          border-color: var(--dsw-alias-label-tertiary, rgba(0,0,0,.42)) !important;
        }
        .weread-btn--ghost:active:not(:disabled) {
          background-color: rgba(127,127,127,.24) !important;
        }

        /* 图标按钮：hover 淡色背景 */
        .weread-btn--icon:hover:not(:disabled) {
          background-color: var(--weread-action-hover, var(--weread-highlight, var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.14)))) !important;
        }

        /* 分段选择器透明胶囊：hover 淡色背景 */
        .weread-btn--option:hover:not(:disabled) {
          background-color: var(--weread-action-hover, var(--weread-highlight, var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.16)))) !important;
        }

        /* 实心 / 主色按钮：hover 微暗 */
        .weread-btn--solid:hover:not(:disabled) { filter: brightness(.93); }
        .weread-btn--solid:active:not(:disabled) { filter: brightness(.86); }

        .weread-btn--book-row:hover:not(:disabled) {
          background-color: var(--weread-action-hover, var(--weread-highlight, var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.10)))) !important;
        }
        .weread-btn--tile > .weread-book-cover {
          box-shadow: 0 2px 7px rgba(0,0,0,.14);
        }
        @media (hover: hover) {
          .weread-btn--tile:hover:not(:disabled) > .weread-book-cover {
            box-shadow: 0 5px 13px rgba(0,0,0,.2);
          }
        }
        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .weread-btn--tile > .weread-book-cover {
            transition: transform .16s ease-out;
          }
          .weread-btn--tile:hover:not(:disabled) > .weread-book-cover {
            transform: translateY(-2px);
          }
        }

        .weread-setup-toggle {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          width: 100%;
          padding-block: 12px;
          padding-inline: calc(var(--weread-setup-content-inset) - 1px);
          box-sizing: border-box;
          border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.24));
          border-radius: 12px;
          background-color: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.08));
          cursor: pointer;
        }
        .weread-setup-toggle:has(:disabled) { cursor: default; }
        .weread-setup-toggle__copy {
          display: grid;
          gap: 3px;
        }
        .weread-setup-toggle__description {
          color: var(--dsw-alias-label-secondary, #5d626b);
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }
        .weread-setup-toggle > input {
          position: absolute;
          inline-size: 1px;
          block-size: 1px;
          opacity: 0;
        }
        .weread-setup-toggle__track {
          position: relative;
          inline-size: 38px;
          block-size: 22px;
          box-sizing: border-box;
          border: 1px solid var(--dsw-alias-label-tertiary, GrayText);
          border-radius: 999px;
          color: var(--dsw-alias-label-secondary, GrayText);
        }
        .weread-setup-toggle__track::before {
          content: '';
          position: absolute;
          inset-block-start: 2px;
          inset-inline-start: 2px;
          inline-size: 16px;
          block-size: 16px;
          border-radius: 50%;
          background-color: currentColor;
        }
        .weread-setup-toggle > input:checked + .weread-setup-toggle__track {
          --weread-switch-fill: var(--dsw-alias-button-primary-fill, #247bbf);
          border-color: var(--weread-switch-fill);
          background-color: var(--weread-switch-fill);
          color: var(--dsw-alias-bg-layer-1, Canvas);
        }
        .weread-setup-toggle > input:checked + .weread-setup-toggle__track::before {
          inset-inline-start: calc(100% - 18px);
        }
        .weread-setup-toggle > input:focus-visible + .weread-setup-toggle__track {
          outline: 2px solid var(--dsw-alias-label-primary, CanvasText);
          outline-offset: 3px;
        }
        .weread-setup-toggle > input:disabled + .weread-setup-toggle__track { opacity: .5; }

        @media (prefers-reduced-motion: no-preference) {
          .weread-setup-toggle__track::before { transition: inset-inline-start .15s ease-out; }
        }
        @media (forced-colors: active) {
          .weread-setup-toggle__track {
            forced-color-adjust: none;
            border-color: CanvasText;
            color: CanvasText;
          }
          .weread-setup-toggle > input:checked + .weread-setup-toggle__track {
            --weread-switch-fill: Highlight;
            color: HighlightText;
          }
        }

        .weread-setup-status:empty { position: absolute; }

        .weread-setup-flow {
          inline-size: 100%;
          min-inline-size: 0;
          box-sizing: border-box;
          border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.24));
          border-radius: 12px;
        }
        .weread-setup-flow__steps {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .weread-setup-flow__step {
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr);
          align-items: start;
          gap: 10px;
          padding-block: 12px;
          padding-inline: calc(var(--weread-setup-content-inset) - 1px);
        }
        .weread-setup-flow__step + .weread-setup-flow__step,
        .weread-setup-flow__footer {
          border-block-start: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.24));
        }
        .weread-setup-flow__marker {
          display: grid;
          place-items: center;
          block-size: 22px;
          border-radius: 50%;
          background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12));
          color: var(--dsw-alias-label-secondary, CanvasText);
          font-size: 12px;
          font-weight: 600;
        }
        .weread-setup-flow__marker--done {
          background: rgba(46,125,80,.14);
          color: var(--dsw-alias-state-success-primary, #35845c);
        }
        .weread-setup-flow__row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 12px;
        }
        .weread-setup-flow__copy {
          flex: 1 1 10rem;
          min-inline-size: 0;
          overflow-wrap: break-word;
        }
        .weread-setup-flow__row > button {
          margin-inline-start: auto;
          max-inline-size: 100%;
          white-space: normal;
        }
        .weread-setup-flow__details { margin-block-start: 10px; }
        .weread-setup-flow__footer {
          display: flex;
          justify-content: flex-end;
          padding-block: 12px;
          padding-inline: calc(var(--weread-setup-content-inset) - 1px);
        }
        @media (pointer: coarse) {
          .weread-setup-flow .weread-btn { min-block-size: 44px; }
        }

        /* 目录章节项 */
        .weread-toc-item:hover {
          background-color: var(--weread-action-hover, var(--weread-highlight, rgba(127,127,127,.14))) !important;
        }
      `;

      function collectStylesheetPageBreaks(body, css) {
        const declarations = new Map();
        if (!/\bbreak-(?:before|after)\s*:/iu.test(css) || typeof CSSStyleSheet !== 'function') {
          return declarations;
        }

        // Inspect detached rules without applying publisher styles to the reader.
        let sheet;
        try {
          sheet = new CSSStyleSheet();
          sheet.replaceSync(css);
        } catch {
          return declarations;
        }
        for (const rule of sheet.cssRules) {
          if (!rule.selectorText || !rule.style) continue;
          const { breakBefore, breakAfter } = rule.style;
          if (!breakBefore && !breakAfter) continue;
          let matches;
          try { matches = body.querySelectorAll(rule.selectorText); } catch { continue; }
          for (const element of matches) {
            const values = declarations.get(element) ?? { before: [], after: [] };
            if (breakBefore) values.before.push(breakBefore);
            if (breakAfter) values.after.push(breakAfter);
            declarations.set(element, values);
          }
        }
        return declarations;
      }

      function restoreReadingPageBreaks(body, css, t) {
        const stylesheetBreaks = collectStylesheetPageBreaks(body, css);
        const isPageBreak = (value) => /^(page|always|left|right|recto|verso)$/iu.test(value);
        const looksLikePageNumber = (value) =>
          /^(?:page\s+|p\.\s*|第\s*)?(?:[a-z]?\d+[a-z]?|[ivxlcdm]+)(?:\s*页)?$/iu.test(value);
        const makeMarker = (page = '') => {
          const marker = document.createElement('span');
          const label = page ? `${t('reader.sourcePage')} ${page}` : t('reader.sourcePageBreak');
          marker.setAttribute('data-weread-page-break', page);
          marker.setAttribute('role', 'doc-pagebreak');
          marker.setAttribute('aria-label', label);
          marker.textContent = label;
          return marker;
        };

        for (const element of body.querySelectorAll('*')) {
          if (element.matches('[role~="doc-pagebreak"]') ||
              element.getAttribute('epub:type')?.split(/\s+/u).includes('pagebreak')) {
            const text = element.textContent.trim();
            const page = element.getAttribute('title')?.trim() || element.getAttribute('aria-label')?.trim() ||
              (looksLikePageNumber(text) ? text : '');
            const marker = makeMarker(page);
            if ((!text || text === page) &&
                !element.querySelector('img, svg, math, audio, video')) {
              if (element.id) marker.id = element.id;
              element.replaceWith(marker);
            } else {
              // Some EPUBs wrap actual prose in a page marker. Keep the prose in place.
              if (element.getAttribute('role') === 'doc-pagebreak') element.removeAttribute('role');
              element.before(marker);
            }
            continue;
          }
          if (!element.matches('article, section, div, p, h1, h2, h3, h4, h5, h6, aside, blockquote, figure, hr, ul, ol, pre, table')) continue;
          if (element.closest('[hidden]') || element.style.display === 'none') continue;

          const rules = stylesheetBreaks.get(element);
          const { breakBefore, breakAfter } = element.style;
          const before = breakBefore ? isPageBreak(breakBefore) :
            rules?.before.length && rules.before.every(isPageBreak);
          const after = breakAfter ? isPageBreak(breakAfter) :
            rules?.after.length && rules.after.every(isPageBreak);
          if (before) element.before(makeMarker());
          if (after && (!before || element.textContent.trim() || element.childElementCount)) {
            element.after(makeMarker());
          }
        }

        // Adjacent CSS and semantic markers can represent the same page boundary.
        const selector = '[data-weread-page-break]';
        for (const marker of body.querySelectorAll(selector)) {
          let previous = marker.previousSibling;
          while (previous?.nodeType === Node.TEXT_NODE && !previous.textContent.trim()) {
            previous = previous.previousSibling;
          }
          if (!previous?.matches?.(selector)) continue;
          if (!marker.id && !marker.getAttribute('data-weread-page-break')) marker.remove();
          else if (!previous.id && !previous.getAttribute('data-weread-page-break')) previous.remove();
        }
      }

      function normalizeReadingHtml(content, chapterTitle, css, t) {
        const template = document.createElement('template');
        template.innerHTML = content;
        const body = template.content;
        const inlineStyles = Array.from(body.querySelectorAll('style'), (style) => style.textContent);
        body.querySelectorAll('style, link, script, iframe, frame, object, embed, base, meta, template')
          .forEach((node) => node.remove());

        const title = String(chapterTitle ?? '').replace(/\s+/gu, '');
        if (title) {
          const heading = Array.from(body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div')).slice(0, 12)
            .find((node) => node.textContent.replace(/\s+/gu, '') === title);
          heading?.setAttribute('data-weread-chapter-heading', '');
        }

        restoreReadingPageBreaks(body, [css, ...inlineStyles].join('\n'), t);
        for (const element of body.querySelectorAll('*')) {
          // Remove publisher typography and layout, while preserving intentional text emphasis.
          const inline = element.style;
          const hidden = inline?.display === 'none';
          const bold = inline?.fontWeight === 'bold' || Number(inline?.fontWeight) >= 600;
          const italic = /^(italic|oblique)\b/u.test(inline?.fontStyle ?? '');
          element.removeAttribute('style');
          element.removeAttribute('class');
          for (const attribute of element.getAttributeNames()) {
            const name = attribute.toLowerCase();
            if (/^on/u.test(name) || ['align', 'face', 'size', 'color', 'bgcolor', 'background', 'srcdoc'].includes(name)) {
              element.removeAttribute(attribute);
            } else if (['href', 'xlink:href', 'src'].includes(name)) {
              const value = element.getAttribute(attribute).replace(/[\u0000-\u0020]/gu, '');
              if (/^(javascript|vbscript):/iu.test(value)) element.removeAttribute(attribute);
            }
          }
          if (hidden) element.setAttribute('hidden', '');
          if (bold && inline) inline.fontWeight = '700';
          if (italic && inline) inline.fontStyle = 'italic';

          if (element.localName === 'img' && !/^(https?:|data:|\/\/)/iu.test((element.getAttribute('src') ?? '').trim())) {
            // WeRead does not expose relative resources from the original EPUB archive.
            const alt = element.getAttribute('alt');
            const note = document.createElement('sup');
            note.title = alt || '注释';
            note.textContent = '〔注〕';
            element.replaceWith(note);
          }
        }
        for (const paragraph of body.querySelectorAll('p')) {
          const firstText = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT).nextNode();
          if (firstText) firstText.data = firstText.data.replace(/^[\t\n\r ]*[\u00a0\u2002\u2003\u3000]+/u, '');
        }
        return template.innerHTML;
      }

      function BookIcon({ size = 18, color = 'currentColor' }) {
        return h('svg', {
          viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true,
          style: { display: 'block', flex: '0 0 auto' },
        },
          h('path', {
            fill: color,
            d: 'M18 2H8a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm-1 18H8a1 1 0 0 1 0-2h9v2zM8 4h9v12H8a3 3 0 0 0-1 .17V5a1 1 0 0 1 1-1z',
          }));
      }

      // ---------------------------------------------------------------------
      // Sidebar nav entry — a compact row next to Plugins / Automation / More.
      //
      // DSH 没有「在导航行区插入一个普通按钮」的 additive slot：官方的
      // sidebar.panellist 点击时会 selectPanel(id) 切换中央主面板，挤掉聊天区，
      // 与「阅读时不占用主会话」冲突。因此这里克隆一条现有导航行的 DOM（类名、
      // 折叠态、hover 样式自动跟随），点击只打开右侧栏，不碰主面板。
      // ---------------------------------------------------------------------
      function installNavEntry({ t, onOpen }) {
        const MARK = 'data-weread-nav-row';
        const esc = (s) => String(s).replace(/["\\]/g, '\\$&');
        const ANCHOR_LABELS = [
          'Automation tasks', '自动化任务', '定时任务', '计划任务',
          'Schedules', 'Plugins', '插件',
        ];
        const BOOK_PATH = 'M18 2H8a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm-1 18H8a1 1 0 0 1 0-2h9v2zM8 4h9v12H8a3 3 0 0 0-1 .17V5a1 1 0 0 1 1-1z';

        function findAnchor() {
          // 模板：任一条标准导航行，只用来复制类名/结构（视觉与折叠态一致）。
          let template = null;
          try {
            const b = document.querySelector('div[class*="panelEntry"] > button[class*="panelRow"]');
            template = b ? b.parentElement : null;
          } catch { /* 选择器不被支持 */ }
          if (!template) return null;

          // 位置：优先紧跟「自动化任务」行。
          for (const label of ANCHOR_LABELS) {
            let btn = null;
            try { btn = document.querySelector(`button[aria-label="${esc(label)}"]`); } catch { /* 非法选择器 */ }
            if (!btn || !btn.parentElement) continue;
            const row = btn.parentElement;
            if (/panelEntry/i.test(String(row.className || ''))) {
              return { template, position: row, beforeMore: false };
            }
          }
          // 结构性兜底：locale/版本改了 aria-label 时，插到「更多」菜单行之前。
          let more = null;
          try { more = document.querySelector('button[class*="panelRow"][aria-haspopup="menu"]'); } catch {}
          if (!more) {
            try { more = document.querySelector('nav button[aria-haspopup="menu"]'); } catch {}
          }
          if (more) {
            const row = (typeof more.closest === 'function' && more.closest('div[class*="panelEntry"]')) || more.parentElement;
            if (row) return { template, position: row, beforeMore: true };
          }
          return { template, position: template, beforeMore: false };
        }

        function build(anchorRow, label) {
          const row = anchorRow.cloneNode(true);
          // 锚点行可能正处于选中态，去掉 active 类名，避免入口一直高亮。
          row.className = String(anchorRow.className || '')
            .split(/\s+/).filter((c) => c && !/Active/i.test(c)).join(' ');
          row.setAttribute(MARK, '');
          row.removeAttribute('aria-current');

          const buttons = Array.from(row.querySelectorAll('button'));
          const btn = buttons[0];
          if (!btn) return null;
          buttons.slice(1).forEach((b) => b.remove()); // 移除「取消固定」等附加按钮
          btn.setAttribute('aria-label', label);
          btn.setAttribute('title', label);
          ['aria-current', 'aria-haspopup', 'aria-expanded', 'aria-controls'].forEach((a) => btn.removeAttribute(a));

          const spans = Array.from(btn.querySelectorAll('span'));
          const glyph = spans[0];
          if (glyph) {
            const oldSvg = glyph.querySelector('svg');
            const size = (oldSvg && oldSvg.getAttribute('width')) || 16;
            glyph.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" style="display:block"><path fill="currentColor" d="${BOOK_PATH}"/></svg>`;
          }
          const titleSpan = spans[spans.length - 1];
          if (titleSpan && titleSpan !== glyph) titleSpan.textContent = label;

          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen();
          });
          return row;
        }

        function sync() {
          const anchor = findAnchor();
          if (!anchor) return;
          const label = t('entry');
          const wide = /Wide/i.test(String(anchor.template.className || ''));
          const existing = document.querySelector(`[${MARK}]`);
          const placed = existing && (anchor.beforeMore
            ? existing.nextElementSibling === anchor.position
            : existing.previousElementSibling === anchor.position);
          if (existing && existing.isConnected && placed
              && existing.getAttribute('data-weread-wide') === String(wide)
              && existing.getAttribute('data-weread-label') === label) return;
          if (existing) existing.remove();
          const row = build(anchor.template, label);
          if (!row) return;
          row.setAttribute('data-weread-wide', String(wide));
          row.setAttribute('data-weread-label', label);
          if (anchor.beforeMore) {
            if (typeof anchor.position.before === 'function') anchor.position.before(row);
            else if (anchor.position.parentNode) anchor.position.parentNode.insertBefore(row, anchor.position);
          } else if (typeof anchor.position.after === 'function') anchor.position.after(row);
          else if (anchor.position.parentNode) anchor.position.parentNode.insertBefore(row, anchor.position.nextSibling);
        }

        let raf = 0;
        const schedule = () => {
          if (raf) return;
          raf = requestAnimationFrame(() => { raf = 0; try { sync(); } catch { /* 侧栏尚未挂载 */ } });
        };
        const observer = new MutationObserver(schedule);
        observer.observe(document.body, {
          childList: true, subtree: true, attributes: true,
          attributeFilter: ['class', 'style', 'aria-label'],
        });
        schedule();
        return () => {
          observer.disconnect();
          if (raf) cancelAnimationFrame(raf);
          const row = document.querySelector(`[${MARK}]`);
          if (row) row.remove();
        };
      }

      // ---------------------------------------------------------------------
      // Home body — QR login + bookshelf
      // ---------------------------------------------------------------------
      function HomeBody({ rpcCall, t, openBook }) {
        const [status, setStatus] = React.useState({ phase: 'loading' });
        const [section, setSection] = React.useState('shelf');
        const [searchEnabled, setSearchEnabled] = React.useState(false);
        const [searchVisited, setSearchVisited] = React.useState(false);
        const [reauthenticate, setReauthenticate] = React.useState(false);
        const showSearch = section === 'search' && searchEnabled;
        const showShelf = section === 'shelf';

        async function openSearch() {
          if (!searchEnabled) {
            openSetup();
            return;
          }
          try {
            const state = await rpcCall('zlibSetupStatus');
            setSearchEnabled(state.enabled);
            if (state.enabled && state.version && state.signedIn) {
              setSearchVisited(true);
              setSection('search');
              return;
            }
          } catch {}
          openSetup();
        }

        function openSetup(relogin = false) {
          setReauthenticate(relogin);
          setSection('setup');
        }
        const [shelfView, setShelfView] = React.useState(() => {
          try {
            return global.localStorage.getItem(SHELF_VIEW_KEY) === 'list' ? 'list' : 'grid';
          } catch {
            return 'grid';
          }
        });
        const [refreshing, setRefreshing] = React.useState(false);
        const [shelfError, setShelfError] = React.useState(false);
        const shelfRequest = React.useRef(null);
        const [qr, setQr] = React.useState(null); // { uid, qrUrl, qrDataUrl, expired }
        const [pollMsg, setPollMsg] = React.useState('waiting');
        const [otpNeeded, setOtpNeeded] = React.useState(false);
        const [otp, setOtp] = React.useState('');
        const ctrlRef = React.useRef(null);
        const uidRef = React.useRef('');
        const qrIssuedAtRef = React.useRef(0);
        const QR_MAX_AGE_MS = 5 * 60 * 1000;

        const abortLogin = React.useCallback(() => {
          if (ctrlRef.current) { try { ctrlRef.current.abort(); } catch {} ctrlRef.current = null; }
        }, []);

        const loadStatus = React.useCallback(async () => {
          try {
            const r = await rpcCall('status');
            setSearchEnabled(r?.searchEnabled === true);
            setStatus(r && r.loggedIn
              ? { phase: 'ready', shelf: Array.isArray(r.shelf) ? r.shelf : [] }
              : { phase: 'loggedOut' });
          } catch {
            setStatus({ phase: 'loggedOut' });
          }
        }, [rpcCall]);

        // Long-poll: the host blocks up to ~65s per call, so a plain loop is fine.
        // WeRead may ask for a 4-digit OTP after the scan (NEED_OTP); in that case
        // we stop the loop and let the user submit the code, then resume polling
        // with the same uid + otp. Without this the scan cannot complete.
        const pollLoop = React.useCallback(async (uid, otpCode, ctrl) => {
          let fastTimeouts = 0;
          while (!ctrl.signal.aborted) {
            let poll;
            const startedAt = Date.now();
            try {
              poll = await rpcCall('loginPoll', { uid, otp: otpCode || '' }, ctrl.signal);
            } catch (e) {
              if (ctrl.signal.aborted) break;
              setPollMsg('failed');
              break;
            }
            if (ctrl.signal.aborted) break;
            if (!poll) { setPollMsg('failed'); break; }
            if (poll.succeed === true) {
              setQr(null);
              setOtpNeeded(false);
              await loadStatus();
              return;
            }
            if (poll.logicCode === 'NEED_OTP' || poll.logicCode === 'OTP_NOT_MATCH') {
              setOtpNeeded(true);
              setPollMsg(poll.logicCode === 'OTP_NOT_MATCH' ? 'otpWrong' : 'needOtp');
              return;
            }
            if (poll.logicCode === 'LOGIN_TIMEOUT') {
              // 实测：这只是约 55s 的长轮询窗口超时，uid/二维码仍然有效，必须继续轮询。
              // 只有当 uid 确实失效（连续快速返回）或二维码超过 5 分钟时才提示过期。
              const elapsed = Date.now() - startedAt;
              fastTimeouts = elapsed < 5000 ? fastTimeouts + 1 : 0;
              if (fastTimeouts >= 3 || Date.now() - qrIssuedAtRef.current > QR_MAX_AGE_MS) {
                setPollMsg('expired');
                setQr((q) => q ? { ...q, expired: true } : q);
                return;
              }
              setPollMsg('waiting');
              continue;
            }
            if (poll.logicCode === 'OTP_EXPIRED') {
              setPollMsg('expired');
              setQr((q) => q ? { ...q, expired: true } : q);
              return;
            }
            setPollMsg('waiting');
          }
        }, [rpcCall, loadStatus]);

        const startLogin = React.useCallback(async () => {
          abortLogin();
          const ctrl = new AbortController();
          ctrlRef.current = ctrl;
          setQr(null);
          setOtpNeeded(false);
          setOtp('');
          setPollMsg('waiting');
          try {
            const info = await rpcCall('loginUid', undefined, ctrl.signal);
            if (!info || !info.uid) {
              if (!ctrl.signal.aborted) setPollMsg('failed');
              return;
            }
            uidRef.current = info.uid;
            qrIssuedAtRef.current = Date.now();
            setQr({ uid: info.uid, qrUrl: info.qrUrl || '', qrDataUrl: info.qrDataUrl || '', expired: false });
            await pollLoop(info.uid, '', ctrl);
          } catch (e) {
            if (!ctrl.signal.aborted) setPollMsg('failed');
          }
        }, [rpcCall, abortLogin, pollLoop]);

        const submitOtp = React.useCallback(async () => {
          const code = String(otp || '').trim();
          const uid = uidRef.current;
          if (!/^\d{4}$/.test(code) || !uid) return;
          abortLogin();
          const ctrl = new AbortController();
          ctrlRef.current = ctrl;
          setOtpNeeded(false);
          setPollMsg('waiting');
          await pollLoop(uid, code, ctrl);
        }, [otp, abortLogin, pollLoop]);

        // Initial load: check status once, then start the login flow only if needed.
        React.useEffect(() => {
          let active = true;
          (async () => {
            let loggedIn = false;
            try {
              const r = await rpcCall('status');
              loggedIn = !!(r && r.loggedIn);
              if (active) setSearchEnabled(r?.searchEnabled === true);
              if (active) setStatus(loggedIn
                ? { phase: 'ready', shelf: Array.isArray(r.shelf) ? r.shelf : [] }
                : { phase: 'loggedOut' });
            } catch {
              if (active) setStatus({ phase: 'loggedOut' });
            }
            if (active && !loggedIn) startLogin();
          })();
          return () => { active = false; abortLogin(); };
        }, [rpcCall, startLogin, abortLogin]);

        const onRefresh = React.useCallback(() => startLogin(), [startLogin]);
        const onLogout = React.useCallback(async () => {
          shelfRequest.current?.abort();
          try { await rpcCall('logout'); } catch {}
          setQr(null);
          setSection('shelf');
          setSearchVisited(false);
          setShelfError(false);
          setStatus({ phase: 'loggedOut' });
          startLogin();
        }, [rpcCall, startLogin]);

        async function refreshShelf() {
          shelfRequest.current?.abort();
          const request = new AbortController();
          shelfRequest.current = request;
          setRefreshing(true);
          setShelfError(false);
          try {
            const { books } = await rpcCall('shelf', undefined, request.signal);
            if (request.signal.aborted) return null;
            setStatus((current) => current.phase === 'ready' ? { ...current, shelf: books } : current);
            return books;
          } catch {
            if (!request.signal.aborted) setShelfError(true);
            return null;
          } finally {
            if (shelfRequest.current === request) {
              shelfRequest.current = null;
              setRefreshing(false);
            }
          }
        }

        // ---- logged-out view ----
        if (status.phase === 'loading') {
          return h('div', { style: styles.center }, h('span', { style: styles.muted }, t('home.loading')));
        }
        if (status.phase === 'loggedOut') {
          const hasQr = qr && qr.qrDataUrl;
          const expired = qr && qr.expired;
          return h('div', { style: styles.center },
            h('div', { style: { fontSize: 15, fontWeight: 600, marginBottom: 6 } }, t('home.loggedOut')),
            h('div', { style: { ...styles.muted, marginBottom: 16, textAlign: 'center' } }, t('home.scanHint')),
            hasQr
              ? h('img', {
                  src: qr.qrDataUrl,
                  alt: 'WeRead QR',
                  style: { width: 200, height: 200, borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.12))', opacity: expired ? 0.4 : 1 },
                })
              : h('div', { style: { width: 200, height: 200, ...styles.center, borderRadius: 8, border: '1px dashed var(--dsw-alias-border-l2, rgba(0,0,0,0.2))' } },
                  h('span', { style: styles.muted }, '…')),
            otpNeeded
              ? h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 12, width: '100%' } },
                  h('div', { style: { ...styles.muted, fontSize: 12, textAlign: 'center' } }, t('home.otpHint')),
                  h('input', {
                    type: 'text',
                    inputMode: 'numeric',
                    maxLength: 4,
                    value: otp,
                    placeholder: t('home.otpPlaceholder'),
                    onChange: (e) => setOtp(String((e && e.target && e.target.value) || '').replace(/\D/g, '').slice(0, 4)),
                    onKeyDown: (e) => { if (e && e.key === 'Enter') submitOtp(); },
                    style: { width: 130, textAlign: 'center', fontSize: 18, letterSpacing: 6, padding: '6px 8px', boxSizing: 'border-box', border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.2))', borderRadius: 6, background: 'var(--dsw-alias-bg-layer-1, #fff)', color: 'var(--dsw-alias-label-primary, #222)' },
                  }),
                  h('button', { type: 'button', className: 'weread-btn weread-btn--solid', onClick: submitOtp, disabled: !/^\d{4}$/.test(String(otp || '').trim()), style: { ...styles.primaryBtn, marginTop: 0 } }, t('home.otpConfirm')),
                  pollMsg === 'otpWrong'
                    ? h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-state-warn-primary, #c8710a)' } }, t('home.otpWrong'))
                    : null,
                )
              : expired
                ? h('div', { style: { marginTop: 10, color: 'var(--dsw-alias-state-warn-primary, #c8710a)', fontSize: 12 } }, t('home.expired'))
                : h('div', { style: { marginTop: 10, ...styles.muted, fontSize: 12 } }, pollMsg === 'waiting' ? t('home.waiting') : t('home.loadFailed')),
            h('button', { type: 'button', className: 'weread-btn weread-btn--solid', onClick: onRefresh, style: styles.primaryBtn }, t('home.refresh')),
            qr && qr.qrUrl
              ? h('a', { href: qr.qrUrl, target: '_blank', rel: 'noreferrer', style: { marginTop: 10, fontSize: 12, color: 'var(--dsw-alias-brand-primary, #247bbf)' } }, t('home.openInBrowser'))
              : null,
          );
        }

        // ---- logged-in view (bookshelf) ----
        const books = status.shelf || [];
        const isList = shelfView === 'list';
        return h('div', { style: { padding: 12, overflowY: 'auto', height: '100%', boxSizing: 'border-box' } },
          h('header', { style: styles.homeHeader },
            h('nav', { 'aria-label': t('home.title'), style: styles.controlRow },
              [
                ['reader.shelf', showShelf, () => setSection('shelf')],
                ['zlib.title', !showShelf, openSearch],
              ].map(([label, selected, onClick]) => h('button', {
                key: label, type: 'button', 'aria-current': selected ? 'page' : undefined,
                className: selected ? 'weread-btn weread-btn--solid' : 'weread-btn weread-btn--option',
                onClick,
                style: selected
                  ? { ...styles.primaryBtn, marginTop: 0, height: 32, padding: '0 14px' }
                  : { ...styles.ghostBtn, border: 0, height: 32, padding: '0 14px', fontSize: 13 },
              }, t(label))),
            ),
            h('div', { style: { ...styles.controlRow, marginInlineStart: 'auto' } },
              showShelf ? h(ChoicePills, {
                label: t('shelf.view'), options: [['grid', t('shelf.grid')], ['list', t('shelf.list')]],
                value: shelfView, segmented: true,
                onChange: (value) => {
                  setShelfView(value);
                  try { global.localStorage.setItem(SHELF_VIEW_KEY, value); } catch {}
                },
              }) : null,
              showShelf ? h('button', {
                type: 'button', className: 'weread-btn weread-btn--icon', disabled: refreshing, onClick: refreshShelf,
                'aria-label': t(refreshing ? 'home.loading' : 'shelf.refresh'), title: t('shelf.refresh'),
                style: { ...styles.homeIconButton, opacity: refreshing ? 0.45 : 1 },
              }, h(HomeActionIcon, { action: 'refresh' })) : null,
              h('button', {
                type: 'button', className: 'weread-btn weread-btn--icon', onClick: onLogout, 'aria-label': t('home.logout'), title: t('home.logout'),
                style: styles.homeIconButton,
              }, h(HomeActionIcon, { action: 'logout' })),
            ),
          ),
          h('div', { hidden: !showShelf, 'aria-busy': refreshing },
            shelfError ? h('p', { role: 'status', style: styles.muted }, t('home.loadFailed')) : null,
            books.length === 0
              ? h('div', { style: styles.center }, h('span', { style: styles.muted }, t('home.empty')))
              : h('ul', { style: isList ? styles.bookList : styles.coverGrid }, books.map((book) =>
                  h('li', { key: book.bookId }, h(CoverTile, { book, t, isList, onOpen: () => openBook(book) })))),
          ),
          searchEnabled && searchVisited
            ? h('div', { hidden: !showSearch }, h(BookSearch, { active: showSearch, rpcCall, t, refreshShelf, openSetup }))
            : null,
          section === 'setup' ? h(SearchSetup, {
            rpcCall, t, onEnabled: setSearchEnabled, onOpenSearch: openSearch, reauthenticate,
          }) : null,
        );
      }

      function SearchSetup({ rpcCall, t, onEnabled, onOpenSearch, reauthenticate }) {
        const [view, setView] = React.useState(null);
        const [pending, setPending] = React.useState('');
        const [error, setError] = React.useState('');
        const [domains, setDomains] = React.useState(null);
        const [domain, setDomain] = React.useState('');
        const [editLogin, setEditLogin] = React.useState(reauthenticate);
        const [showPassword, setShowPassword] = React.useState(false);
        const [scan, setScan] = React.useState(null);
        const alive = React.useRef(false);
        const operation = React.useRef(null);
        const scanId = React.useRef('');
        const ids = React.useId();

        function updateView(next) {
          setView(next);
          onEnabled(next.enabled);
        }

        async function perform(action, endpoint, payload, accept) {
          if (operation.current) return;
          const request = new AbortController();
          operation.current = request;
          setPending(action);
          setError('');
          try {
            const next = await rpcCall(endpoint, payload, request.signal);
            if (!request.signal.aborted && alive.current) accept(next);
          } catch (err) {
            if (!request.signal.aborted && alive.current) {
              setError(searchErrorKey(err, 'zlib.setupUnavailable'));
            }
          } finally {
            if (operation.current === request) {
              operation.current = null;
              if (alive.current) setPending('');
            }
          }
        }

        React.useEffect(() => {
          alive.current = true;
          perform('load', 'zlibSetupStatus', undefined, updateView);
          return () => {
            alive.current = false;
            operation.current?.abort();
            operation.current = null;
            if (scanId.current) void rpcCall('zlibSetupCancel', { id: scanId.current }).catch(() => {});
          };
        }, [rpcCall]);

        React.useEffect(() => {
          const id = scan?.id;
          if (!id) return;
          const request = new AbortController();
          let timer;
          async function poll() {
            try {
              const next = await rpcCall('zlibSetupPoll', { id }, request.signal);
              if (request.signal.aborted) return;
              if (next.phase === 'waiting') {
                setScan({ ...next, id });
                timer = setTimeout(poll, 1000);
                return;
              }
              scanId.current = '';
              setScan(null);
              if (next.phase === 'done') await perform('load', 'zlibSetupStatus', undefined, updateView);
              else setError('zlib.setupQrFailed');
            } catch (err) {
              if (!request.signal.aborted) {
                setScan(null);
                setError(searchErrorKey(err, 'zlib.setupQrFailed'));
                void rpcCall('zlibSetupCancel', { id }).catch(() => {});
              }
            }
          }
          void poll();
          return () => {
            clearTimeout(timer);
            request.abort();
          };
        }, [scan?.id, rpcCall]);

        function toggle(event) {
          const enabled = event.target.checked;
          perform('toggle', 'zlibSetupEnable', { enabled }, (next) => {
            updateView(next);
            setDomains(null);
            setDomain('');
          });
        }

        function detectDomains() {
          perform('domains', 'zlibSetupDomains', undefined, (next) => {
            setDomains(next.domains);
            setDomain(next.domains[0] || '');
          });
        }

        function submitLogin(event) {
          event.preventDefault();
          if (!domain || operation.current) return;
          const form = event.currentTarget;
          const values = new FormData(form);
          const password = String(values.get('password') || '');
          form.elements.namedItem('password').value = '';
          setShowPassword(false);
          perform('login', 'zlibSetupLogin', { domain, email: values.get('email'), password }, (next) => {
            updateView(next);
            setEditLogin(false);
          });
        }

        function startScan() {
          perform('scan', 'zlibSetupScan', undefined, ({ id }) => {
            scanId.current = id;
            setScan({ id });
          });
        }

        function cancelScan() {
          perform('cancel', 'zlibSetupCancel', { id: scan.id }, () => {
            scanId.current = '';
            setScan(null);
          });
        }

        const locked = Boolean(pending || scan);
        const button = (key, onClick, primary = false, disabled = locked) => h('button', {
          type: 'button', onClick, disabled, className: primary ? 'weread-btn weread-btn--solid' : 'weread-btn weread-btn--ghost',
          style: primary ? { ...styles.primaryBtn, marginTop: 0 } : styles.ghostBtn,
        }, t(key));
        const installed = Boolean(view?.version);
        const signedIn = Boolean(view?.signedIn);
        const searchReady = signedIn && !editLogin;
        const linked = view?.delivery === 'linked';
        const step = (number, title, description, { done, action, details }) =>
          h('li', { className: 'weread-setup-flow__step' },
            h('span', {
              className: done ? 'weread-setup-flow__marker weread-setup-flow__marker--done' : 'weread-setup-flow__marker',
              'aria-hidden': true,
            }, done ? '✓' : number),
            h('div', null,
              h('div', { className: 'weread-setup-flow__row' },
                h('div', { className: 'weread-setup-flow__copy' },
                  h('h3', { style: styles.setupStepTitle }, t(title)),
                  h('p', { style: styles.setupStepDescription }, description),
                ),
                action,
              ),
              details ? h('div', { className: 'weread-setup-flow__details' }, details) : null,
            ),
          );
        const progressKey = {
          load: 'home.loading', toggle: 'home.loading', install: 'zlib.setupInstalling',
          domains: 'zlib.setupCheckingDomains', login: 'zlib.setupSigningIn',
          scan: 'zlib.setupStartingScan', cancel: 'home.loading',
        }[pending];
        const loginForm = installed && !searchReady && domains?.length
          ? h('form', { onSubmit: submitLogin, style: styles.setupForm },
            h('fieldset', { disabled: locked, style: styles.setupForm },
              h('label', { htmlFor: ids + '-domain' }, t('zlib.setupDomain')),
              h('select', {
                id: ids + '-domain', name: 'domain', value: domain, style: styles.setupInput,
                onChange: (event) => setDomain(event.target.value),
              }, domains.map((item) => h('option', { key: item, value: item }, new URL(item).host))),
              h('label', { htmlFor: ids + '-email' }, t('zlib.setupEmail')),
              h('input', {
                id: ids + '-email', name: 'email', type: 'email', autoComplete: 'section-zlibrary username',
                required: true, maxLength: 254, style: styles.setupInput,
              }),
              h('label', { htmlFor: ids + '-password' }, t('zlib.setupPassword')),
              h('input', {
                id: ids + '-password', name: 'password', type: showPassword ? 'text' : 'password',
                autoComplete: 'section-zlibrary current-password', required: true,
                maxLength: 1024, style: styles.setupInput,
              }),
              h('label', { style: styles.controlRow },
                h('input', {
                  type: 'checkbox', checked: showPassword, 'aria-controls': ids + '-password',
                  onChange: (event) => setShowPassword(event.target.checked),
                }), t('zlib.setupShowPassword'),
              ),
              h('button', {
                type: 'submit', className: 'weread-btn weread-btn--solid',
                style: { ...styles.primaryBtn, marginTop: 4, justifySelf: 'start' },
              }, t('zlib.setupSignIn')),
            ),
          ) : null;

        return h('section', { 'aria-labelledby': ids + '-title', style: styles.setupPanel },
          h('h2', { id: ids + '-title', style: styles.setupTitle }, t('zlib.setupTitle')),
          view ? h('label', { className: 'weread-setup-toggle' },
            h('span', { className: 'weread-setup-toggle__copy' },
              h('strong', { id: ids + '-toggle' }, t('zlib.setupEnable')),
              h('span', {
                id: ids + '-hint', className: 'weread-setup-toggle__description',
              }, t('zlib.setupDescription')),
            ),
            h('input', {
              type: 'checkbox', switch: '', role: 'switch', checked: view.enabled, disabled: locked, onChange: toggle,
              'aria-labelledby': ids + '-toggle', 'aria-describedby': ids + '-hint',
            }),
            h('span', { className: 'weread-setup-toggle__track', 'aria-hidden': true }),
          ) : null,
          h('p', { className: 'weread-setup-status', role: 'status', style: { ...styles.setupHint, margin: 0 } },
            progressKey ? t(progressKey) : scan ? t(scan.scanned ? 'zlib.setupScanned' : 'home.waiting') : ''),
          error ? h('p', { role: 'alert', style: styles.setupError }, t(error)) : null,
          !view && !pending ? button('home.retry', () => perform('load', 'zlibSetupStatus', undefined, updateView)) : null,
          view?.enabled ? h('div', { className: 'weread-setup-flow' },
            h('ol', { className: 'weread-setup-flow__steps', role: 'list' },
              step(1, 'zlib.setupInstallTitle',
                installed ? `${t('zlib.setupInstalled')} ${view.version}`
                  : t(view.installSupported ? 'zlib.setupInstallHint' : 'zlib.setupUnsupported'),
                {
                  done: installed,
                  action: !installed && view.installSupported
                    ? button('zlib.setupInstallAction', () => perform('install', 'zlibSetupInstall', undefined, updateView), true)
                    : null,
                },
              ),
              step(2, 'zlib.setupLoginTitle',
                t(!installed ? 'zlib.setupAwaitInstall' : searchReady ? 'zlib.setupSignedIn'
                  : domains?.length === 0 ? 'zlib.setupNoDomains' : 'zlib.setupLoginHint'),
                {
                  done: installed && searchReady,
                  action: !installed ? null : searchReady
                    ? button('zlib.setupRelogin', () => setEditLogin(true))
                    : !domains?.length ? button('zlib.setupFindDomain', detectDomains, true) : null,
                  details: loginForm,
                },
              ),
              step(3, 'zlib.setupLinkTitle',
                t(!signedIn ? 'zlib.setupAwaitLogin' : linked ? 'zlib.setupLinked'
                  : view.delivery === 'mismatch' ? 'zlib.accountMismatch' : 'zlib.setupLinkHint'),
                {
                  done: signedIn && linked,
                  action: !signedIn ? null : scan
                    ? button('zlib.setupCancel', cancelScan, false, Boolean(pending))
                    : button(linked ? 'zlib.setupRelink' : 'zlib.setupScanAction', startScan),
                  details: scan?.qr ? h('img', { src: scan.qr, alt: t('zlib.setupQrAlt'), style: styles.setupQr }) : null,
                },
              ),
            ),
            searchReady ? h('div', { className: 'weread-setup-flow__footer' },
              button('zlib.setupOpenSearch', onOpenSearch, true),
            ) : null,
          ) : null,
        );
      }

      function BookSearch({ active, rpcCall, t, refreshShelf, openSetup }) {
        const [query, setQuery] = React.useState('');
        const [order, setOrder] = React.useState('bestmatch');
        const [format, setFormat] = React.useState('all');
        const [submitted, setSubmitted] = React.useState('');
        const [popularLanguage, setPopularLanguage] = React.useState('all');
        const [popularByLanguage, setPopularByLanguage] = React.useState({});
        const [retryPopular, setRetryPopular] = React.useState(0);
        const [result, setResult] = React.useState(null);
        const [searching, setSearching] = React.useState(false);
        const [importing, setImporting] = React.useState('');
        const [imported, setImported] = React.useState(() => new Map());
        const [message, setMessage] = React.useState('');
        const searchRequest = React.useRef(null);
        const labelId = React.useId();
        const popular = popularByLanguage[popularLanguage] ?? {};
        const popularBatchCount = Math.ceil((popular.books?.length ?? 0) / POPULAR_BATCH_SIZE);
        const popularBatch = (popular.batch ?? 0) % (popularBatchCount || 1);
        const popularOffset = popularBatch * POPULAR_BATCH_SIZE;
        const popularBooks = popular.books?.slice(popularOffset, popularOffset + POPULAR_BATCH_SIZE) ?? [];

        const updatePopular = React.useCallback((update) => {
          setPopularByLanguage((current) => ({
            ...current, [popularLanguage]: { ...current[popularLanguage], ...update },
          }));
        }, [popularLanguage]);

        React.useEffect(() => () => searchRequest.current?.abort(), []);

        React.useEffect(() => {
          if (!active) return;
          const request = new AbortController();
          updatePopular({ error: '' });
          rpcCall('zlibPopular', { language: popularLanguage }, request.signal).then(({ books, language }) => {
            if (request.signal.aborted) return;
            if (popularLanguage === 'chinese' && language !== popularLanguage) {
              updatePopular({ error: 'zlib.popularReload' });
            } else {
              updatePopular({ books });
            }
          }).catch((err) => {
            if (!request.signal.aborted) updatePopular({ error: searchErrorKey(err, 'zlib.popularFailed') });
          });
          return () => request.abort();
        }, [active, popularLanguage, retryPopular, rpcCall, updatePopular]);

        async function search(terms, page, sortOrder = order, fileFormat = format) {
          const keyword = terms.trim();
          if (searchRequest.current || importing || !keyword) return;
          const request = new AbortController();
          searchRequest.current = request;
          setSearching(true);
          setSubmitted(keyword);
          setMessage('');
          if (keyword !== result?.keyword || fileFormat !== result?.format) setResult(null);
          try {
            const data = await rpcCall('zlibSearch', { query: keyword, page, order: sortOrder, format: fileFormat }, request.signal);
            if (request.signal.aborted) return;
            if (fileFormat !== 'all' && data.format !== fileFormat) {
              setMessage(t('zlib.formatReload'));
              return;
            }
            setResult({ ...data, keyword, order: sortOrder, format: fileFormat });
            setOrder(sortOrder);
            if (!data.books.length) setMessage(t('zlib.empty'));
          } catch (err) {
            if (!request.signal.aborted) {
              if (err.message === 'zlib.login') openSetup(true);
              else setMessage(t(searchErrorKey(err, 'zlib.searchFailed')));
            }
          } finally {
            if (searchRequest.current === request) {
              searchRequest.current = null;
              if (!request.signal.aborted) setSearching(false);
            }
          }
        }

        function changeQuery(value) {
          setQuery(value);
          if (value.trim()) return;
          searchRequest.current?.abort();
          searchRequest.current = null;
          setSearching(false);
          setSubmitted('');
          setResult(null);
          if (!importing) setMessage('');
        }

        async function importBook(book) {
          if (importing || imported.has(book.id)) return;
          setImporting(book.id);
          setMessage(`${t('zlib.adding')} ${book.title}`);
          try {
            const { bookId, alreadyExisted } = await rpcCall('zlibImport', { id: book.id });
            const statusKey = alreadyExisted ? 'zlib.existed' : 'zlib.added';
            setImported((previous) => new Map(previous).set(book.id, alreadyExisted ? 'zlib.duplicate' : 'zlib.done'));
            const shelf = await refreshShelf();
            const text = `${t(statusKey)} · ${book.title}`;
            setMessage(shelf?.some((item) => item.bookId === bookId) ? text : `${text} — ${t('zlib.shelfPending')}`);
          } catch (err) {
            if (['zlib.wereadLogin', 'zlib.accountMismatch', 'zlib.login'].includes(err.message)) {
              openSetup(err.message === 'zlib.login');
            }
            setMessage(t(searchErrorKey(err, 'zlib.importFailed')));
          } finally {
            setImporting('');
          }
        }

        return h('search', { 'aria-labelledby': labelId + '-label' },
          h('form', { onSubmit: (event) => { event.preventDefault(); search(query, 1); } },
            h('div', { style: { ...styles.controlRow, justifyContent: 'space-between', marginBottom: 5 } },
              h('label', { id: labelId + '-label', htmlFor: labelId, style: { fontSize: 13, fontWeight: 600 } }, t('zlib.label')),
              h('button', {
                type: 'button', className: 'weread-btn weread-btn--option', onClick: () => openSetup(),
                style: { ...styles.ghostBtn, border: 0, minHeight: 28 },
              }, t('zlib.setupTitle')),
            ),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('input', {
                id: labelId, name: 'q', type: 'search', value: query, required: true, maxLength: 200,
                placeholder: t('zlib.placeholder'), enterKeyHint: 'search', autoCapitalize: 'none', spellCheck: false,
                onChange: (event) => changeQuery(event.target.value),
                style: {
                  flex: 1, minWidth: 0, minHeight: 40, padding: '0 10px', borderRadius: 8,
                  border: '1px solid var(--dsw-alias-border-l2, #b4b4b4)',
                  background: 'var(--dsw-alias-bg-layer-1, #fff)', color: 'var(--dsw-alias-label-primary, #222)',
                  font: 'inherit', fontSize: '1rem',
                },
              }),
              h('button', {
                type: 'submit', className: 'weread-btn weread-btn--solid', disabled: searching || Boolean(importing),
                style: { ...styles.primaryBtn, marginTop: 0, height: 40, flexShrink: 0 },
              }, t('zlib.submit')),
            ),
            h('div', { style: { ...styles.controlRow, marginTop: 10 } },
              h('div', { role: 'group', 'aria-label': t('zlib.order'), style: styles.controlRow },
                ['bestmatch', 'popular', 'rating'].map((value) => h('button', {
                  key: value, type: 'button', 'aria-pressed': value === order,
                  className: value === order ? 'weread-btn weread-btn--solid' : 'weread-btn weread-btn--ghost',
                  'aria-disabled': searching || Boolean(importing),
                  onClick: () => {
                    if (searchRequest.current || importing || value === order) return;
                    if (submitted) search(submitted, 1, value);
                    else setOrder(value);
                  },
                  style: {
                    ...(value === order ? styles.primaryBtn : styles.ghostBtn),
                    marginTop: 0, height: 34, padding: '0 12px', fontSize: 12,
                    border: value === order ? '1px solid transparent' : styles.ghostBtn.border,
                  },
                }, t(`zlib.order.${value}`))),
              ),
              submitted ? h('button', {
                type: 'button', 'aria-pressed': format === 'epub', 'aria-disabled': searching || Boolean(importing),
                className: format === 'epub' ? 'weread-btn weread-btn--solid' : 'weread-btn weread-btn--ghost',
                'aria-label': t('zlib.epubOnly'), title: t('zlib.epubOnly'),
                onClick: () => {
                  if (searchRequest.current || importing) return;
                  const value = format === 'epub' ? 'all' : 'epub';
                  setFormat(value);
                  search(submitted, 1, order, value);
                },
                style: {
                  ...(format === 'epub' ? styles.primaryBtn : styles.ghostBtn),
                  display: 'grid', placeItems: 'center', minWidth: 48, height: 28, padding: '0 8px',
                  fontSize: 11, fontWeight: 600, letterSpacing: '.03em',
                  marginTop: 0, marginInlineStart: 'auto', flexShrink: 0,
                },
              }, 'EPUB') : null,
            ),
          ),
          h('div', { role: 'status', style: { ...styles.muted, fontSize: 13, marginTop: 8, overflowWrap: 'anywhere' } },
            searching ? t('zlib.searching') : message),
          !submitted ? h('section', { style: { marginTop: 10 }, 'aria-labelledby': labelId + '-popular' },
            h('div', { style: { ...styles.controlRow, justifyContent: 'space-between', marginBottom: 12 } },
              h('h2', { id: labelId + '-popular', style: { fontSize: 15, fontWeight: 600, margin: 0 } }, t('zlib.popular')),
              h('div', { style: styles.controlRow },
                h(ChoicePills, {
                  label: t('zlib.popularLanguage'),
                  options: [['all', t('zlib.popularAll')], ['chinese', t('zlib.popularChinese')]],
                  value: popularLanguage, onChange: setPopularLanguage,
                }),
                popularBatchCount > 1 && !popular.error ? h('button', {
                  type: 'button', className: 'weread-btn weread-btn--ghost', style: styles.ghostBtn,
                  'aria-controls': labelId + '-popular-books',
                  onClick: () => updatePopular({ batch: (popularBatch + 1) % popularBatchCount }),
                }, t('zlib.popularNextBatch')) : null,
              ),
            ),
            popular.error ? h('div', { role: 'status', style: { ...styles.muted, fontSize: 13, marginBottom: 12 } },
              t(popular.error), ' ',
              popular.error !== 'zlib.popularReload' ? h('button', {
                type: 'button', className: 'weread-btn weread-btn--ghost',
                onClick: popular.error === 'zlib.login' ? () => openSetup(true) : () => setRetryPopular((count) => count + 1),
                style: styles.ghostBtn,
              }, t(popular.error === 'zlib.login' ? 'zlib.setupRelogin' : 'home.retry')) : null,
            ) : null,
            popularBooks.length
              ? h('ul', { id: labelId + '-popular-books', style: styles.coverGrid }, popularBooks.map((book) => h('li', { key: book.title },
                  h(CoverTile, { book, t, disabled: Boolean(importing), onOpen: () => {
                    const title = book.title.slice(0, 200);
                    setQuery(title);
                    search(title, 1);
                  } }),
                )))
              : !popular.error ? h('div', { role: 'status', style: { ...styles.muted, fontSize: 13 } },
                  t(popular.books ? 'zlib.popularEmpty' : 'home.loading')) : null,
          ) : null,
          result?.books.length ? h('ul', { style: { listStyle: 'none', margin: '8px 0 0', padding: 0 } },
            result.books.map((book) => {
              const done = imported.has(book.id);
              const rating = book.rating > 0 ? `${t('zlib.rating')} ${book.rating.toFixed(1)}` : '';
              const meta = [book.format.toUpperCase(), book.language, book.year, book.size, book.publisher, rating].filter(Boolean).join(' · ');
              return h('li', {
                key: book.id,
                style: {
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '10px 0', borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.12))',
                },
              },
                h('div', { style: { minWidth: 0, overflowWrap: 'anywhere' } },
                  h('div', { style: { fontSize: 14, fontWeight: 500 } }, book.title),
                  h('div', { style: { ...styles.muted, fontSize: 12, marginTop: 2 } }, [book.author, meta].filter(Boolean).join(' · ')),
                ),
                h('button', {
                  type: 'button', className: 'weread-btn weread-btn--ghost', disabled: done || searching || Boolean(importing),
                  onClick: () => importBook(book), style: { ...styles.ghostBtn, minHeight: 40, flexShrink: 0 },
                }, t(done ? imported.get(book.id) : importing === book.id ? 'home.loading' : 'zlib.add')),
              );
            }),
          ) : null,
          result && (result.page > 1 || result.hasNext) ? h('div', { style: { display: 'flex', gap: 8, marginTop: 12 } },
            h('button', { type: 'button', className: 'weread-btn weread-btn--ghost', disabled: result.page <= 1 || searching || Boolean(importing), style: styles.ghostBtn,
              onClick: () => search(result.keyword, result.page - 1, result.order, result.format) }, t('zlib.prev')),
            h('button', { type: 'button', className: 'weread-btn weread-btn--ghost', disabled: !result.hasNext || searching || Boolean(importing), style: styles.ghostBtn,
              onClick: () => search(result.keyword, result.page + 1, result.order, result.format) }, t('zlib.next')),
          ) : null,
        );
      }

      function searchErrorKey(error, fallback) {
        const key = error?.message;
        return key?.startsWith('zlib.') && Object.hasOwn(ZH, key) ? key : fallback;
      }

      function ChoicePills({ label, options, value, onChange, segmented = false }) {
        return h('div', { role: 'group', 'aria-label': label, style: segmented ? styles.viewPicker : styles.controlRow },
          options.map(([id, text]) => h('button', {
            key: id, type: 'button', 'aria-pressed': id === value, onClick: () => onChange(id),
            className: id === value ? 'weread-btn weread-btn--solid' : (segmented ? 'weread-btn weread-btn--option' : 'weread-btn weread-btn--ghost'),
            style: segmented
              ? { ...styles.viewOption, ...(id === value ? styles.viewOptionActive : {}) }
              : id === value ? { ...styles.primaryBtn, height: 28, marginTop: 0, padding: '0 11px', fontSize: 12 } : styles.ghostBtn,
          }, text)),
        );
      }

      function HomeActionIcon({ action }) {
        return h('svg', {
          width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
          strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
        }, h('path', { d: action === 'refresh'
          ? 'M20 4v5h-5M20 9a8 8 0 1 0 0 6'
          : 'M10 4H5v16h5m6-12 4 4-4 4m4-4H9' }));
      }

      function CoverTile({ book, t, onOpen, disabled, isList = false }) {
        const [failedCover, setFailedCover] = React.useState('');
        const imageStyle = isList ? styles.rowCover : styles.cover;
        return h('button', {
          type: 'button', onClick: onOpen, disabled, title: book.title,
          className: isList ? 'weread-btn weread-btn--book-row' : 'weread-btn weread-btn--tile',
          style: isList ? { ...styles.coverTile, ...styles.bookRow } : styles.coverTile,
        },
          book.cover && book.cover !== failedCover
            ? h('img', {
                className: 'weread-book-cover',
                src: book.cover, alt: '', width: 120, height: 174, loading: 'lazy', decoding: 'async',
                referrerPolicy: 'no-referrer', onError: () => setFailedCover(book.cover),
                style: { ...imageStyle, objectFit: 'contain' },
              })
            : h('span', { className: 'weread-book-cover', 'aria-hidden': true, style: { ...imageStyle, display: 'grid', placeItems: 'center' } },
                h(BookIcon, { size: isList ? 20 : 28, color: 'var(--dsw-alias-label-tertiary, #888)' })),
          h('span', { style: { display: 'grid', gap: 2, minWidth: 0, marginTop: isList ? 0 : 5 } },
            h('span', { style: { ...styles.coverCaption, fontSize: isList ? 14 : 13, fontWeight: 600 } }, book.title),
            book.author ? h('span', { style: { ...styles.coverCaption, ...styles.muted, fontSize: 12 } }, book.author) : null,
            typeof book.progress === 'number' && book.progress >= 0
              ? h('span', { style: { ...styles.muted, fontSize: 11 } }, `${t('home.progress')} ${Math.round(book.progress)}%`)
              : null,
          ),
        );
      }

      // ---------------------------------------------------------------------
      // Reader body — chapter rendering
      // ---------------------------------------------------------------------
      function ReaderActionIcon({ name }) {
        const paths = {
          shelf: 'M4 4h5v15H4zM9 7h5v12H9zM15 6l4-1 3 13-4 1zM3 21h19',
          catalog: 'M6.5 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 8.5h8M8 12h8m-8 3.5h5',
          light: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 3v1.5m0 15V21M3 12h1.5m15 0H21M5.6 5.6l1 1m10.8 10.8 1 1M5.6 18.4l1-1m10.8-10.8 1-1',
          dark: 'M19.5 14.6a.5.5 0 0 1 .5.7A8 8 0 1 1 9.3 4.6a.5.5 0 0 1 .7.5 7.5 7.5 0 0 0 9.5 9.5Z',
          paper: 'M12 7.5C9.8 6 7 5.6 4.7 6.2 4 6.4 3.5 7 3.5 7.7v9.5c0 .7.6 1.1 1.3 1 2.6-.5 5.1 0 7.2 1.3 2.1-1.3 4.6-1.8 7.2-1.3.7.1 1.3-.3 1.3-1V7.7c0-.7-.5-1.3-1.2-1.5-2.3-.6-5.1-.2-7.3 1.3Zm0 0v12',
        };
        return h('svg', {
          width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
          strokeWidth: 1.35, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
        }, h('path', { d: paths[name] }));
      }

      function ReaderThemePicker({ theme, t }) {
        const detailsRef = React.useRef(null);
        const summaryRef = React.useRef(null);

        React.useEffect(() => {
          const details = detailsRef.current;
          const closeOutside = (event) => {
            if (details.open && !details.contains(event.target)) details.open = false;
          };
          details.ownerDocument.addEventListener('pointerdown', closeOutside, true);
          return () => details.ownerDocument.removeEventListener('pointerdown', closeOutside, true);
        }, []);

        const close = () => {
          detailsRef.current.open = false;
          summaryRef.current.focus();
        };

        return h('details', {
          ref: detailsRef, className: 'weread-reader-theme',
          onBlur: (event) => {
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
              event.currentTarget.open = false;
            }
          },
          onKeyDown: (event) => {
            if (event.key !== 'Escape' || !event.currentTarget.open) return;
            event.preventDefault();
            event.stopPropagation();
            close();
          },
        },
          h('summary', {
            ref: summaryRef, className: 'weread-reader-action weread-reader-action--icon',
            'aria-label': t('reader.theme'),
            title: `${t('reader.themeAction')} · ${t(`reader.theme.${theme}`)}`,
          }, h(ReaderActionIcon, { name: theme })),
          h('div', { className: 'weread-reader-theme-options' },
            h(ChoicePills, {
              label: t('reader.theme'), options: READER_THEMES.map((id) => [id, t(`reader.theme.${id}`)]),
              value: theme, segmented: true,
              onChange: (value) => {
                saveReaderTheme(value);
                close();
              },
            })),
        );
      }

      function ReaderBody({ useTabInfo, rpcCall, t }) {
        const tabInfo = useTabInfo ? useTabInfo() : {};
        const tab = tabInfo.tab || {};
        const params = tab.navigation && tab.navigation.params ? tab.navigation.params : {};
        const bookId = params.bookId || '';
        const bookTitle = params.title || tab.title || t('reader.title');
        const bookAuthor = params.author || '';

        const [catalog, setCatalog] = React.useState([]);
        const [curIdx, setCurIdx] = React.useState(-1);
        const [chapter, setChapter] = React.useState(null);
        const [bookProgress, setBookProgress] = React.useState(null);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState('');
        const [showToc, setShowToc] = React.useState(false);
        const theme = React.useSyncExternalStore(subscribeReaderTheme, getReaderTheme);
        const chapterContent = React.useMemo(() => renderChapter(chapter, t), [chapter, t]);

        const scrollRef = React.useRef(null);
        const navSeq = React.useRef(0);
        const curInfoRef = React.useRef({ chapterUid: '', chapterIdx: -1, arrayIdx: -1, chapterOffset: 0 });
        const flushTimer = React.useRef(null);
        const totalCharsRef = React.useRef(0);
        const chapterWordOffsets = React.useRef([0]);

        const report = React.useCallback(() => {
          const info = curInfoRef.current;
          if (!bookId || !info.chapterUid) return;
          const total = Math.max(1, catalog.length);
          const progress = Math.round(((info.arrayIdx >= 0 ? info.arrayIdx : 0) / total) * 100);
          rpcCall('reportProgress', {
            bookId,
            chapterUid: info.chapterUid,
            chapterIdx: info.chapterIdx,
            chapterOffset: info.chapterOffset,
            progress,
            elapsedSeconds: 0,
          }).catch(() => {});
        }, [rpcCall, bookId, catalog.length]);

        const reportRef = React.useRef(report);
        reportRef.current = report;

        const loadChapter = React.useCallback(async (idx) => {
          const ch = catalog[idx];
          if (!ch) return;
          const seq = ++navSeq.current;
          setLoading(true); setError(''); setShowToc(false);
          try {
            const r = await rpcCall('chapter', { bookId, chapterUid: ch.chapterUid });
            if (seq !== navSeq.current) return;
            setChapter({ ...r, chapterUid: ch.chapterUid, title: ch.title });
            setCurIdx(idx);
            setBookProgress(estimateBookProgress(chapterWordOffsets.current, idx, 0));
            totalCharsRef.current = chapterCharCount(r);
            curInfoRef.current = { chapterUid: ch.chapterUid, chapterIdx: ch.chapterIdx, arrayIdx: idx, chapterOffset: 0 };
            requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; });
          } catch (e) {
            if (seq !== navSeq.current) return;
            setError(String((e && e.message) || e));
          } finally {
            if (seq === navSeq.current) setLoading(false);
          }
        }, [rpcCall, bookId, catalog]);

        // Initial load
        React.useEffect(() => {
          setBookProgress(null);
          if (!bookId) { setLoading(false); setError(t('reader.noBook')); return; }
          const ctrl = new AbortController();
          const seq = ++navSeq.current;
          (async () => {
            try {
              const cat = await rpcCall('catalog', { bookId }, ctrl.signal);
              const chapters = (cat && cat.chapters) || [];
              if (seq !== navSeq.current) return;
              const wordOffsets = [0];
              for (const ch of chapters) {
                wordOffsets.push(wordOffsets.at(-1) + Math.max(1, Number(ch.wordCount) || 1));
              }
              chapterWordOffsets.current = wordOffsets;
              setCatalog(chapters);
              if (!chapters.length) { setLoading(false); setError(t('reader.noCatalog')); return; }
              let start = 0;
              let savedOffset = 0;
              try {
                const gp = await rpcCall('getProgress', { bookId }, ctrl.signal);
                if (gp && gp.chapterUid != null) {
                  const i = chapters.findIndex((c) => String(c.chapterUid) === String(gp.chapterUid));
                  if (i >= 0) {
                    start = i;
                    savedOffset = Number(gp.chapterOffset) || 0;
                  }
                }
              } catch {}
              const ch = chapters[start];
              const r = await rpcCall('chapter', { bookId, chapterUid: ch.chapterUid }, ctrl.signal);
              if (seq !== navSeq.current) return;
              setChapter({ ...r, chapterUid: ch.chapterUid, title: ch.title });
              setCurIdx(start);
              totalCharsRef.current = chapterCharCount(r);
              const fraction = Math.min(1, Math.max(0, savedOffset / (totalCharsRef.current || 1)));
              setBookProgress(estimateBookProgress(wordOffsets, start, fraction));
              curInfoRef.current = { chapterUid: ch.chapterUid, chapterIdx: ch.chapterIdx, arrayIdx: start, chapterOffset: savedOffset };
              requestAnimationFrame(() => {
                if (scrollRef.current && totalCharsRef.current > 0) {
                  const el = scrollRef.current;
                  const max = el.scrollHeight - el.clientHeight;
                  if (max > 0) el.scrollTop = Math.round((savedOffset / totalCharsRef.current) * max);
                }
              });
              setLoading(false);
            } catch (e) {
              if (ctrl.signal.aborted || seq !== navSeq.current) return;
              setError(String((e && e.message) || e));
              setLoading(false);
            }
          })();
          return () => { try { ctrl.abort(); } catch {} };
        }, [bookId, rpcCall, t]);

        // Save progress on unmount
        React.useEffect(() => () => {
          if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null; }
          reportRef.current();
        }, []);

        const onScroll = React.useCallback((e) => {
          if (loading || error || curIdx < 0) return;
          const el = e.currentTarget;
          const max = el.scrollHeight - el.clientHeight;
          const top = Math.max(0, el.scrollTop);
          const frac = max > 0 ? (top > 0 && max - top <= 1 ? 1 : top / max) : 0;
          setBookProgress(estimateBookProgress(chapterWordOffsets.current, curIdx, frac));
          curInfoRef.current.chapterOffset = Math.round(frac * totalCharsRef.current);
          if (flushTimer.current) clearTimeout(flushTimer.current);
          flushTimer.current = setTimeout(() => { reportRef.current(); flushTimer.current = null; }, 2000);
        }, [loading, error, curIdx]);

        const prev = React.useCallback(() => {
          reportRef.current();
          if (curIdx > 0) loadChapter(curIdx - 1);
        }, [curIdx, loadChapter]);
        const next = React.useCallback(() => {
          reportRef.current();
          if (curIdx < catalog.length - 1) loadChapter(curIdx + 1);
        }, [curIdx, catalog.length, loadChapter]);
        const pick = React.useCallback((idx) => {
          reportRef.current();
          loadChapter(idx);
        }, [loadChapter]);

        const goShelf = React.useCallback(() => {
          if (tab.actions && typeof tab.actions.openTab === 'function') tab.actions.openTab('wereadHome');
        }, [tab.actions]);

        return h('div', {
          'data-weread-reader': theme,
          style: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' },
        },
          h('style', null, READING_CSS),
          // Top bar
          h('header', { style: {
            ...styles.controlRow, justifyContent: 'space-between', gap: 8,
            padding: '5px 12px', borderBottom: '1px solid var(--dsw-alias-border-l2)',
            background: theme === 'light' ? '#fff' : 'var(--weread-toolbar)',
          } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flex: '1 1 104px', minWidth: 0 } },
              h('span', {
                title: bookAuthor ? `${bookTitle} · ${bookAuthor}` : bookTitle,
                style: { ...styles.coverCaption, minWidth: 0, fontSize: 14, fontWeight: 600 },
              }, bookTitle),
              bookProgress === null ? null : h('span', {
                title: t('reader.progressEstimate'), role: 'progressbar',
                'aria-label': t('home.progress'), 'aria-valuenow': bookProgress,
                style: { ...styles.muted, flexShrink: 0, whiteSpace: 'nowrap', fontSize: 12, fontVariantNumeric: 'tabular-nums' },
              }, `${bookProgress}%`)),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 2, marginInlineStart: 'auto' } },
              h('button', {
                type: 'button', onClick: goShelf, className: 'weread-reader-action weread-reader-action--icon',
                'aria-label': t('reader.backToShelf'), title: t('reader.backToShelf'),
              }, h(ReaderActionIcon, { name: 'shelf' })),
              h('button', {
                type: 'button', onClick: () => setShowToc((v) => !v),
                className: 'weread-reader-action weread-reader-action--icon',
                'aria-label': t('reader.catalog'), title: t('reader.catalog'), 'aria-expanded': showToc,
              }, h(ReaderActionIcon, { name: 'catalog' })),
              h(ReaderThemePicker, { theme, t }),
            ),
          ),

          // Content
          h('div', {
            ref: scrollRef, onScroll,
            style: { flex: 1, overflowY: 'auto', position: 'relative', scrollPaddingBlockEnd: '4.5rem' },
          },
            loading
              ? h('div', { style: styles.center }, h('span', { style: styles.muted }, t('reader.loading')))
              : error
                ? h('div', { style: styles.center }, h('span', { style: styles.muted }, error))
                : chapterContent,
          ),

          curIdx >= 0 && !showToc ? h('nav', {
            className: 'weread-reader-chapter-nav',
            'aria-label': t('reader.chapterNavigation'),
          },
            h('button', { type: 'button', className: 'weread-btn weread-reader-action', onClick: prev, disabled: curIdx <= 0 }, t('reader.prev')),
            h('span', { style: { ...styles.muted, fontSize: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }, `${curIdx + 1} / ${catalog.length}`),
            h('button', { type: 'button', className: 'weread-btn weread-reader-action', onClick: next, disabled: curIdx >= catalog.length - 1 }, t('reader.next')),
          ) : null,

          // TOC overlay
          showToc
            ? h('div', { style: {
                position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column',
                background: 'var(--dsw-alias-bg-layer-1, #fff)', boxSizing: 'border-box',
              } },
                h('div', { style: { padding: '10px 12px', borderBottom: '1px solid var(--dsw-alias-border-l2)', background: 'var(--weread-toolbar)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  h('span', { style: { fontSize: 14, fontWeight: 600 } }, t('reader.toc')),
                  h('button', { type: 'button', className: 'weread-btn weread-btn--ghost', onClick: () => setShowToc(false), style: styles.ghostBtn }, '✕')),
                h('div', { style: { flex: 1, overflowY: 'auto', padding: '6px 0' } },
                  catalog.map((c, i) => h('div', {
                    key: c.chapterUid, onClick: () => pick(i), role: 'button', tabIndex: 0,
                    className: 'weread-btn weread-toc-item',
                    onKeyDown: (e) => { if (e.key === 'Enter') pick(i); },
                    style: {
                      padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                      fontWeight: i === curIdx ? 600 : 400,
                      background: i === curIdx ? 'var(--weread-highlight)' : 'transparent',
                    },
                  }, c.title))),
              )
            : null,
        );
      }

      function estimateBookProgress(wordOffsets, chapterIndex, fraction) {
        const chapterStart = wordOffsets[chapterIndex];
        const chapterLength = wordOffsets[chapterIndex + 1] - chapterStart;
        const position = chapterStart + chapterLength * fraction;
        return Math.floor(position / wordOffsets.at(-1) * 100);
      }

      function chapterCharCount(chapter) {
        if (!chapter || !chapter.content) return 0;
        if (chapter.format === 'txt') return String(chapter.content).length;
        return String(chapter.content).replace(/<[^>]*>/g, '').length;
      }

      function renderChapter(chapter, t) {
        if (!chapter) return h('div', { style: styles.center }, h('span', { style: styles.muted }, t('reader.noContent')));
        const content = chapter.content || '';
        if (chapter.format === 'txt') {
          const label = t('reader.sourcePageBreak');
          const pages = content.split('\f').filter((page) => page.trim());
          return h('article', { 'data-weread-content': '', 'data-weread-txt': '' },
            pages.map((page, index) => h(React.Fragment, { key: index },
              index > 0 ? h('span', { 'data-weread-page-break': '', role: 'doc-pagebreak', 'aria-label': label }, label) : null,
              page.replace(/(^|\r?\n)[\u00a0\u2002\u2003\u3000]+/gu, '$1')
                .split(/\r?\n[\t ]*\r?\n(?:[\t ]*\r?\n)*/u)
                .map((paragraph, paragraphIndex) => h('p', { key: paragraphIndex }, paragraph)))));
        }
        return h('article', {
          'data-weread-content': '',
          dangerouslySetInnerHTML: { __html: normalizeReadingHtml(content, chapter.title, chapter.css, t) },
        });
      }

      // Reader title chip — shows the book title in the tab
      function ReaderTitle({ useTabInfo }) {
        const tabInfo = useTabInfo ? useTabInfo() : {};
        const tab = tabInfo.tab || {};
        const params = (tab.navigation && tab.navigation.params) || {};
        const label = params.title || tab.title || '微信读书';
        return h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, label);
      }

      // ---------------------------------------------------------------------
      // Shared styles
      // ---------------------------------------------------------------------
      const styles = {
        setupPanel: {
          '--weread-setup-content-inset': '16px',
          display: 'grid', justifyItems: 'start', gap: 10, maxWidth: 440, marginInline: 'auto', fontSize: 13,
        },
        setupTitle: { fontSize: 16, margin: 0, fontWeight: 650 },
        setupStepTitle: { fontSize: 14, margin: 0, fontWeight: 600 },
        setupStepDescription: { margin: '3px 0 0', color: 'var(--dsw-alias-label-secondary, #5d626b)', lineHeight: 1.45 },
        setupHint: { margin: '4px 0 6px', color: 'var(--dsw-alias-label-secondary, #5d626b)', lineHeight: 1.5 },
        setupError: { margin: 0, color: 'var(--dsw-alias-state-warn-primary, #996000)' },
        setupForm: { display: 'grid', gap: 5, margin: 0, padding: 0, border: 0, minWidth: 0 },
        setupInput: {
          width: '100%', padding: '6px 8px', boxSizing: 'border-box', font: 'inherit', minHeight: 34,
          borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.4))',
          background: 'var(--dsw-alias-bg-layer-1, Canvas)', color: 'var(--dsw-alias-label-primary, CanvasText)',
        },
        setupQr: { display: 'block', width: 'min(100%, 192px)', aspectRatio: '1', margin: '8px 0', background: '#fff' },
        controlRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
        homeHeader: {
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: '8px 10px', paddingBottom: 10, marginBottom: 12,
          borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.10))',
        },
        homeIconButton: {
          display: 'grid', placeItems: 'center', minWidth: 32, minHeight: 32,
          padding: 0, border: 0, borderRadius: 8, background: 'transparent',
          color: 'var(--dsw-alias-label-secondary, #5d626b)', cursor: 'pointer',
        },
        viewPicker: {
          display: 'inline-flex', gap: 2, padding: 2, borderRadius: 999,
          background: 'rgba(127,127,127,0.12)',
        },
        viewOption: {
          minHeight: 28, padding: '0 10px', border: 0, borderRadius: 999,
          background: 'transparent', color: 'var(--dsw-alias-label-primary, CanvasText)',
          fontSize: 12, cursor: 'pointer',
        },
        viewOptionActive: {
          background: 'var(--weread-choice-selected-bg, var(--dsw-alias-bg-layer-1, Canvas))',
          color: 'var(--weread-choice-selected-ink, var(--dsw-alias-label-primary, CanvasText))',
          fontWeight: 600,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        },
        bookList: { display: 'grid', gap: 8, listStyle: 'none', margin: 0, padding: 0 },
        bookRow: {
          flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, boxSizing: 'border-box',
          border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.12))', borderRadius: 8,
        },
        rowCover: {
          display: 'block', flexShrink: 0, width: 46, height: 62, borderRadius: 4,
          background: 'var(--dsw-alias-bg-layer-1, #eef0f3)',
        },
        coverGrid: {
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 104px), 1fr))',
          gap: '16px 12px', listStyle: 'none', padding: '0 0 12px', margin: 0,
        },
        coverTile: {
          width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2,
          padding: 0, border: 0, borderRadius: 6, background: 'transparent', textAlign: 'start',
          font: 'inherit', lineHeight: 1.35, color: 'var(--dsw-alias-label-primary, #1a1a1a)', cursor: 'pointer',
        },
        cover: {
          display: 'block', width: '100%', height: 'auto', aspectRatio: '120 / 174',
          borderRadius: 6, background: 'var(--dsw-alias-bg-layer-1, #eef0f3)',
        },
        coverCaption: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        center: {
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          flex: 1, minHeight: 160, padding: 16, textAlign: 'center', boxSizing: 'border-box',
        },
        muted: { color: 'var(--dsw-alias-label-tertiary, #8a8a8a)' },
        primaryBtn: {
          marginTop: 16, padding: '0 16px', height: 36, borderRadius: 999, border: 'none',
          background: 'var(--dsw-alias-button-primary-fill, #247bbf)', color: '#fff', cursor: 'pointer', fontSize: 13,
        },
        ghostBtn: {
          padding: '0 10px', height: 28, borderRadius: 999, cursor: 'pointer', fontSize: 12,
          border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.12))',
          background: 'transparent', color: 'var(--dsw-alias-label-primary, #1a1a1a)',
        },
      };

      // ---------------------------------------------------------------------
      // Plugin definition
      // ---------------------------------------------------------------------
      return {
        inject: ['slots', 'connection', 'locale', 'sidebarRight', 'sidebarRightTabs'],
        apply(ctx) {
          const t = ctx.locale.bind(NS);

          const rpcCall = async (endpoint, payload, signal) => {
            const res = await ctx.connection.rpc.call(CHANNEL, endpoint, payload, signal);
            if (res && res.ok === false) {
              const err = new Error((res.error && res.error.message) || 'rpc error');
              err.code = res.error && res.error.code;
              throw err;
            }
            return res ? res.value : undefined;
          };

          const openBook = (book) => {
            if (!book || !book.bookId) return;
            ctx.sidebarRight.openResource('dsh-resource://weread/' + book.bookId, {
              params: { bookId: book.bookId, title: book.title, author: book.author },
            });
          };

          ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'weread: locale');

          ctx.effect(() => {
            const syncTheme = (event) => {
              if (event.storageArea === global.localStorage &&
                  (event.key === READER_THEME_KEY || event.key === null)) applyReaderTheme(event.newValue);
            };
            global.addEventListener('storage', syncTheme);
            return () => global.removeEventListener('storage', syncTheme);
          }, 'weread: reader theme');

          // 全局注入按钮交互态 CSS（首页 / 搜索 / 阅读器共用）。
          ctx.effect(() => {
            const head = global.document && global.document.head;
            if (!head) return () => {};
            const style = global.document.createElement('style');
            style.setAttribute('data-weread-ui', '');
            style.textContent = BUTTON_CSS;
            head.appendChild(style);
            return () => { try { style.remove(); } catch {} };
          }, 'weread: button css');

          // Sidebar nav entry（与「插件 / 自动化任务 / 更多」同款小行）。
          // 不再注册 sidebar.footer.action —— 那个位置是占满宽度的底部大按钮。
          ctx.effect(() => installNavEntry({
            t,
            onOpen: () => ctx.sidebarRight.openTab('wereadHome'),
          }), 'weread: nav entry');

          // Home tab (page)
          ctx.effect(() => {
            const unregTab = ctx.sidebarRightTabs.register({
              id: 'weread-home',
              kind: 'wereadHome',
              title: () => t('home.title'),
            });
            const unregBody = ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
              name: 'sidebar.right.pane.tab',
              key: 'weread-home',
            }, () => h(HomeBody, { rpcCall, t, openBook })));
            return () => { try { unregBody(); } catch {} try { unregTab(); } catch {} };
          }, 'weread: home tab');

          // Reader resource tab
          ctx.effect(() => {
            const unregTab = ctx.sidebarRightTabs.register({
              id: 'weread',
              kind: 'wereadReader',
              patterns: ['dsh-resource://weread/**'],
              priority: 'extension',
              title: (address) => String(address).slice('dsh-resource://weread/'.length),
            });
            const unregBody = ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
              name: 'sidebar.right.pane.tab',
              key: 'weread',
            }, ({ useTabInfo }) => h(ReaderBody, { useTabInfo, rpcCall, t })));
            const unregTitle = ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
              name: 'sidebar.right.pane.tab.title',
              key: 'weread',
            }, ({ useTabInfo }) => h(ReaderTitle, { useTabInfo })));
            return () => {
              try { unregTitle(); } catch {}
              try { unregBody(); } catch {}
              try { unregTab(); } catch {}
            };
          }, 'weread: reader tab');
        },
      };
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
