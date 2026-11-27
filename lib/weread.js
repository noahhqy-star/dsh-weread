// 微信读书 Web 非官方 API：host 侧完成全部 HTTP 与解密（浏览器 CORS 拦不住，Node fetch 可以）。
// 算法逐字节对照 /tmp/wr_probe7.mjs 与 /tmp/wr_fetch_weread_epub.py 移植。
import crypto from 'node:crypto';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0';
const BASE = 'https://weread.qq.com';
const HTML_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
const JSON_ACCEPT = 'application/json, text/plain, */*';

const md5 = (s) => crypto.createHash('md5').update(String(s), 'utf8').digest('hex');
const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

// ---- 算法 ---- //

export function wereadE(value) {
  const s = String(value);
  const h = md5(s);
  let result = h.slice(0, 3);
  let chunks;
  let typeFlag;
  if (/^\d+$/.test(s)) {
    chunks = [];
    for (let i = 0; i < s.length; i += 9) {
      const c = s.slice(i, i + 9);
      chunks.push(parseInt(c, 10).toString(16));
    }
    typeFlag = '3';
  } else {
    chunks = [...s].map((c) => c.charCodeAt(0).toString(16));
    typeFlag = '4';
  }
  result += typeFlag + '2' + h.slice(-2);
  chunks.forEach((ch, i) => {
    result += ch.length.toString(16).padStart(2, '0') + ch;
    if (i < chunks.length - 1) result += 'g';
  });
  if (result.length < 20) result += h.slice(0, 20 - result.length);
  return result + md5(result).slice(0, 3);
}

export function wereadSign(query) {
  let a = 0x15051505;
  let b = a;
  const len = query.length;
  let i = len - 1;
  while (i > 0) {
    a = (a ^ (query.charCodeAt(i) << ((len - i) % 30))) & 0x7fffffff;
    b = (b ^ (query.charCodeAt(i - 1) << (i % 30))) & 0x7fffffff;
    i -= 2;
  }
  return (a + b).toString(16).toLowerCase();
}

export function jsString(v) {
  if (v === true) return 'true';
  if (v === false) return 'false';
  if (v === null) return 'null';
  return String(v);
}

export function sortedQuery(params) {
  return Object.keys(params)
    .sort()
    .map((k) => k + '=' + encodeURIComponent(jsString(params[k])))
    .join('&');
}

export function webAppId(ua = UA) {
  const prefix = [...ua.split(' ').slice(0, 12)]
    .map((p) => String(p.length % 10))
    .join('');
  let v = 0;
  for (const ch of ua) v = (0x83 * v + ch.charCodeAt(0)) & 0x7fffffff;
  return `wb${prefix}h${v}`;
}

export function makeContentParams(bookId, chapterUid, psvts, { style = false, sc = 1 } = {}) {
  let ctValue = Math.floor(Date.now() / 1000);
  let ct = String(ctValue);
  if (wereadE(ct) === psvts) {
    ctValue += 1;
    ct = String(ctValue);
  }
  const params = {
    b: wereadE(bookId),
    c: wereadE(chapterUid),
    r: String(Math.floor(Math.random() * 10000) ** 2),
    ct,
    ps: psvts,
    pc: wereadE(ct),
    sc,
    prevChapter: false,
    st: style ? 1 : 0,
  };
  params.s = wereadSign(sortedQuery(params));
  return params;
}

export function makeReadParams({
  bookId,
  chapterUid,
  chapterIdx,
  chapterOffset,
  progress,
  summary,
  psvts,
  pclts,
  token,
  elapsedSeconds = 0,
}) {
  const ts = Date.now();
  const rn = Math.floor(Math.random() * 1000);
  const ct = Math.floor(ts / 1000);
  let pc = pclts;
  if (pc == null || String(pc) === '' || String(pc) === '0') pc = wereadE(ct);
  const params = {
    appId: webAppId(),
    b: wereadE(bookId),
    c: wereadE(chapterUid || 0),
    ci: Number(chapterIdx || 0),
    co: Number(chapterOffset || 0),
    sm: (summary || '').slice(0, 20),
    pr: progress,
    rt: Math.max(0, Number(elapsedSeconds || 0)),
    ts,
    rn,
    sg: sha256(`${ts}${rn}${token}`),
    ct,
    ps: psvts,
    pc,
  };
  params.s = wereadSign(sortedQuery(params));
  return params;
}

// ---- 解密 ---- //

function checkedBody(responseText) {
  if (responseText.length <= 32) return '';
  const expected = responseText.slice(0, 32);
  const body = responseText.slice(32);
  if (md5(body).toUpperCase() !== expected) {
    throw new Error(`Shard MD5 mismatch: expected=${expected}`);
  }
  return body;
}

function swapPositions(encoded) {
  const length = encoded.length;
  if (length < 4) return [];
  if (length < 11) return [0, 2];
  const n = Math.min(4, Math.floor((length + 9) / 10));
  let tmp = '';
  for (let i = length - 1; i > length - n - 1; i--) {
    tmp += String(parseInt(encoded.charCodeAt(i).toString(2), 4));
  }
  const result = [];
  const m = length - n - 2;
  const step = String(m).length;
  let i = 0;
  while (result.length < 10 && i + step < tmp.length) {
    result.push(parseInt(tmp.slice(i, i + step), 10) % m);
    result.push(parseInt(tmp.slice(i + 1, i + 1 + step), 10) % m);
    i += step;
  }
  return result;
}

function reverseSwaps(encoded, positions) {
  const chars = [...encoded];
  for (let i = positions.length - 1; i >= 1; i -= 2) {
    for (const k of [1, 0]) {
      const left = positions[i] + k;
      const right = positions[i - 1] + k;
      const tmp = chars[left];
      chars[left] = chars[right];
      chars[right] = tmp;
    }
  }
  return chars.join('');
}

function repairUtf8(binaryText) {
  let out = '';
  let i = 0;
  while (i < binaryText.length) {
    const b0 = binaryText.charCodeAt(i);
    if (b0 >= 0xc0 && b0 <= 0xdf && i + 1 < binaryText.length) {
      const b1 = binaryText.charCodeAt(i + 1);
      if (b1 >= 0x80 && b1 <= 0xbf) {
        out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
        i += 2;
        continue;
      }
    }
    if (b0 >= 0xe0 && b0 <= 0xef && i + 2 < binaryText.length) {
      const b1 = binaryText.charCodeAt(i + 1);
      const b2 = binaryText.charCodeAt(i + 2);
      if (b1 >= 0x80 && b1 <= 0xbf && b2 >= 0x80 && b2 <= 0xbf) {
        out += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
        i += 3;
        continue;
      }
    }
    if (b0 >= 0xf0 && b0 <= 0xf7 && i + 3 < binaryText.length) {
      const b1 = binaryText.charCodeAt(i + 1);
      const b2 = binaryText.charCodeAt(i + 2);
      const b3 = binaryText.charCodeAt(i + 3);
      if (b1 >= 0x80 && b1 <= 0xbf && b2 >= 0x80 && b2 <= 0xbf && b3 >= 0x80 && b3 <= 0xbf) {
        out += String.fromCharCode(
          ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f),
        );
        i += 4;
        continue;
      }
    }
    out += binaryText[i];
    i += 1;
  }
  return out;
}

function decodeEncodedPayload(encodedPayload) {
  if (!encodedPayload) return '';
  const stripped = encodedPayload.slice(1);
  const reordered = reverseSwaps(stripped, swapPositions(stripped));
  const b64 = reordered
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/]/g, '');
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = Buffer.from(b64 + padding, 'base64').toString('latin1');
  return repairUtf8(binary);
}

function decodeContentShards(e0, e1, e3) {
  return decodeEncodedPayload(checkedBody(e0) + checkedBody(e1) + checkedBody(e3));
}

function decodeStyleShard(e2) {
  return decodeEncodedPayload(checkedBody(e2));
}

function extractBody(source) {
  const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(source);
  if (m) return m[1];
  return source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

// ---- __INITIAL_STATE__ 提取（健壮的花括号配对） ---- //

function extractInitialState(html) {
  const marker = 'window.__INITIAL_STATE__';
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error('__INITIAL_STATE__ not found');
  const eq = html.indexOf('=', idx);
  if (eq < 0) throw new Error('__INITIAL_STATE__ assignment not found');
  const brace = html.indexOf('{', eq);
  if (brace < 0) throw new Error('__INITIAL_STATE__ object not found');
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = brace; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(brace, i + 1));
    }
  }
  throw new Error('unbalanced __INITIAL_STATE__');
}

function normalizeChapterInfos(payload, bookId) {
  let candidates;
  if (Array.isArray(payload)) candidates = payload;
  else if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) candidates = payload.data;
    else if (Array.isArray(payload.books)) candidates = payload.books;
    else candidates = [payload];
  } else throw new Error('Unexpected chapterInfos response');

  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue;
    const id = String(item.bookId || (item.book && item.book.bookId) || '');
    if (id === bookId) {
      const chapters = item.updated || item.chapterInfos || item.chapters || [];
      return { book: item, chapters: chapters.filter((ch) => ch && ch.chapterUid) };
    }
  }
  throw new Error(`Could not find catalog for bookId=${bookId}`);
}

/** 把书架 __INITIAL_STATE__ 归一化成统一的书籍数组（含进度/排序）。纯函数，便于测试。 */
export function normalizeShelf(state) {
  const shelf = (state && typeof state === 'object' && state.shelf) || {};

  // 当前 web 书架的 rawBooks 是「以 bookId 为 key 的对象」，旧版/其它形态可能是数组。
  let raw = shelf.rawBooks;
  if (raw && !Array.isArray(raw)) raw = Object.keys(raw).map((k) => raw[k]);
  if (!Array.isArray(raw)) raw = Array.isArray(shelf.books) ? shelf.books : [];
  if (!Array.isArray(raw)) raw = [];

  // 进度（0-100）通常单独放在 bookProgress 数组里，也兼容 book 上的 progress 字段。
  const progressById = new Map();
  if (Array.isArray(shelf.bookProgress)) {
    for (const p of shelf.bookProgress) {
      if (!p || p.bookId == null) continue;
      if (typeof p.progress === 'number') progressById.set(String(p.bookId), p.progress);
    }
  }

  // recentBooks 是「bookId 数组」，给出最近阅读顺序。
  const orderById = new Map();
  if (Array.isArray(shelf.recentBooks)) {
    shelf.recentBooks.forEach((id, i) => orderById.set(String(id), i));
  }

  const books = [];
  for (const b of raw) {
    if (!b || typeof b !== 'object') continue;
    const id = String(b.bookId ?? b.id ?? '');
    if (!id) continue;
    books.push({
      bookId: id,
      title: b.title ?? '',
      author: b.author ?? '',
      cover: normalizeCover(b.cover),
      format: b.format ?? '',
      category: b.category ?? '',
      totalWords: b.totalWords ?? 0,
      progress: typeof b.progress === 'number' ? b.progress : (progressById.get(id) ?? undefined),
      finishReading: !!b.finishReading,
    });
  }

  // 有 recentBooks 时按其顺序排，否则保持原序（稳定的插入顺序）。
  books.sort((a, b) => {
    const oa = orderById.get(a.bookId);
    const ob = orderById.get(b.bookId);
    if (oa !== undefined && ob !== undefined) return oa - ob;
    if (oa !== undefined) return -1;
    if (ob !== undefined) return 1;
    return 0;
  });

  return books;
}

/**
 * 把 /web/shelf/sync 的批量阅读进度合并进书架（纯函数，便于测试）。
 * 真实 /web/shelf 的 __INITIAL_STATE__ 里 bookProgress 为空，百分比只能从这个
 * 单次请求拿到；顺便带上 updateTime 用于「最近读过」排序，方便续读。
 */
export function mergeShelfProgress(books, sync) {
  const byId = new Map();
  const list = sync && Array.isArray(sync.bookProgress) ? sync.bookProgress : [];
  for (const p of list) {
    if (!p || p.bookId == null) continue;
    byId.set(String(p.bookId), {
      progress: typeof p.progress === 'number' ? p.progress : undefined,
      lastReadTime: Number(p.updateTime) || 0,
    });
  }
  if (!byId.size) return books;
  const merged = books.map((b) => {
    const p = byId.get(b.bookId);
    if (!p) return b;
    return {
      ...b,
      progress: p.progress !== undefined ? p.progress : b.progress,
      lastReadTime: p.lastReadTime,
    };
  });
  // 最近读过的排前面；未读（无进度）之间保持书架原有顺序（稳定排序）。
  return merged.sort((a, b) => (Number(b.lastReadTime) || 0) - (Number(a.lastReadTime) || 0));
}

function normalizeCover(cover) {
  if (!cover || typeof cover !== 'string') return '';
  if (/^(https?:|data:|blob:)/i.test(cover)) return cover;
  if (cover.startsWith('//')) return `https:${cover}`;
  return cover;
}

function readerUrl(bookId, chapterUid = null) {
  let url = `${BASE}/web/reader/${wereadE(bookId)}`;
  if (chapterUid != null) url += 'k' + wereadE(chapterUid);
  return url;
}

// ---- 服务 ---- //

export class WeReadService {
  constructor(authStore, identityStore, logger = console) {
    this.authStore = authStore;
    this.identityStore = identityStore;
    this.logger = logger;
    this._tokenCache = null;
    this._fpCache = null;
  }

  log(...args) {
    this.logger?.info?.('weread', ...args);
  }

  async _fp() {
    if (this._fpCache) return this._fpCache;
    const rec = await this.identityStore.load();
    if (rec && typeof rec.wr_fp === 'string' && rec.wr_fp) {
      this._fpCache = rec.wr_fp;
      return this._fpCache;
    }
    // 4 字节无符号随机数，十进制，作为设备指纹
    const fp = crypto.randomBytes(4).readUInt32BE(0).toString();
    this._fpCache = fp;
    await this.identityStore.save({ wr_fp: fp });
    return fp;
  }

  async _token(force = false) {
    if (!force && this._tokenCache) return this._tokenCache;
    this._tokenCache = await this.authStore.load();
    return this._tokenCache;
  }

  async _cookie() {
    const fp = await this._fp();
    // 模块热重载/进程重启后 _tokenCache 为空，但凭据已落盘；这里统一走 _token()
    // 从 authStore 读回，避免「已登录却发出无 cookie 请求」。
    const tok = await this._token();
    const parts = [];
    if (tok && tok.vid) {
      parts.push(`wr_vid=${tok.vid}`, `wr_skey=${tok.skey || ''}`);
      // 续期接口需要 wr_rt；平时多带一个 cookie 无副作用。
      if (tok.refreshToken) parts.push(`wr_rt=${encodeURIComponent(tok.refreshToken)}`);
    }
    parts.push(`wr_fp=${fp}`);
    return parts.join('; ');
  }

  async _captureSetCookie(setCookie, tok) {
    if (!setCookie || !tok) return false;
    let changed = false;
    for (const raw of setCookie) {
      const pair = raw.split(';')[0];
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if ((name === 'wr_vid' || name === 'wr_skey') && value) {
        if (name === 'wr_vid') tok.vid = value;
        if (name === 'wr_skey') tok.skey = value;
        changed = true;
      }
    }
    if (changed) await this.authStore.save({ ...tok });
    return changed;
  }

  async _request(url, { method = 'GET', body, referer = `${BASE}/`, accept = JSON_ACCEPT, signal } = {}) {
    const headers = {
      accept,
      origin: 'https://weread.qq.com',
      referer,
      'user-agent': UA,
      cookie: await this._cookie(),
    };
    if (body !== undefined) headers['content-type'] = 'application/json;charset=UTF-8';
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
    const text = await res.text();
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (setCookie.length) await this._captureSetCookie(setCookie, this._tokenCache);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}: ${text.slice(0, 300)}`);
    return { status: res.status, text };
  }

  async _getText(url, referer = `${BASE}/`) {
    const r = await this._request(url, { referer, accept: HTML_ACCEPT });
    return r.text;
  }

  async _postJson(url, data, referer = `${BASE}/`) {
    const r = await this._request(url, { method: 'POST', body: data, referer });
    return JSON.parse(r.text);
  }

  // ---- 登录 ---- //

  async getLoginUid() {
    const r = await this._request(`${BASE}/api/auth/getLoginUid`);
    return JSON.parse(r.text);
  }

  qrUrl(uid) {
    return `${BASE}/web/confirm?uid=${encodeURIComponent(uid)}`;
  }

  /**
   * 把 confirm 链接编码成二维码 SVG data URL，供客户端 <img> 直接展示。
   * 复用 profile 里已提升的 `qrcode` 包；缺失时返回 null（客户端降级为「在浏览器打开」链接）。
   */
  async qrImageDataUrl(uid) {
    const text = this.qrUrl(uid);
    try {
      const mod = await import('qrcode');
      const qrcode = mod && mod.default ? mod.default : mod;
      const svg = await qrcode.toString(text, { type: 'svg', width: 220, margin: 1 });
      const b64 = Buffer.from(svg, 'utf8').toString('base64');
      return `data:image/svg+xml;base64,${b64}`;
    } catch (err) {
      this.logger?.warn?.('weread: qrcode unavailable, fallback to link | qrcode 不可用，降级为链接', err?.message ?? err);
      return null;
    }
  }

  async getLoginInfo(uid, otp = '', signal) {
    const r = await this._request(
      `${BASE}/api/auth/getLoginInfo?uid=${encodeURIComponent(uid)}&otp=${encodeURIComponent(otp)}`,
      { signal },
    );
    const data = JSON.parse(r.text);
    // WeRead 成功响应的 logicCode 并不总是 LOGIN_SUCCESS，只要 succeed 为真且带上
    // vid/skey 就落盘；否则 host 会告诉客户端「登录成功」但书架仍是未登录状态。
    if (data && (data.succeed === true || data.succeed === 1)) {
      const vid = String(data.webLoginVid ?? data.vid ?? '');
      const skey = String(data.accessToken ?? data.skey ?? '');
      const refreshToken = String(data.refreshToken ?? '');
      if (vid && skey) {
        this._tokenCache = { vid, skey, refreshToken };
        await this.authStore.save(this._tokenCache);
      }
    }
    return data;
  }

  async accountId() {
    const token = await this._token(true);
    return token?.skey ? String(token.vid ?? '') : '';
  }

  async isLoggedIn() {
    // 探测结果分三种：ok / expired（明确 errcode）/ network（网络或解析异常）。
    const probe = async () => {
      const tok = await this._token(true);
      if (!tok || !tok.vid || !tok.skey) return 'no-token';
      let lastErr;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const r = await this._request(`${BASE}/api/userInfo`);
          const data = JSON.parse(r.text);
          return data && data.errcode ? 'expired' : 'ok';
        } catch (err) {
          lastErr = err;
          if (attempt === 0) await new Promise((done) => setTimeout(done, 300));
        }
      }
      this.logger?.warn?.('weread: userInfo probe failed', lastErr?.message ?? lastErr);
      return 'network';
    };

    const first = await probe();
    if (first === 'ok') return true;
    if (first === 'network') {
      // 一次网络抖动不能把用户踢回扫码页；凭据仍在，保持登录态（书架取不到时
      // status 处理器会兜底为空数组），等下次自然恢复。
      return true;
    }
    // wr_skey 约 90 分钟过期；用 refreshToken 静默续期后再探测一次。
    if (first === 'expired' && await this.renew()) return (await probe()) === 'ok';
    return false;
  }

  async logout() {
    this._tokenCache = null;
    await this.authStore.clear();
  }

  async renew() {
    try {
      const before = this._tokenCache && this._tokenCache.skey;
      const r = await this._postJson(`${BASE}/web/login/renewal`, { rq: '%2Fweb%2Fbook%2Fread', ql: false });
      // 实测该接口有时返回 errCode（购买授权提示）却仍下发新的 wr_skey；
      // 因此以「skey 是否轮换」或 succ 为准，而不是只看响应体。
      const after = this._tokenCache && this._tokenCache.skey;
      return !!r.succ || (!!after && after !== before);
    } catch (err) {
      this.logger?.warn?.('weread: renewal failed', err);
      return false;
    }
  }

  // ---- 书架 / 图书 ---- //

  async shelf() {
    const html = await this._getText(`${BASE}/web/shelf`, `${BASE}/web/shelf`);
    const state = extractInitialState(html);
    let books = normalizeShelf(state);
    try {
      const r = await this._request(`${BASE}/web/shelf/sync`, { referer: `${BASE}/web/shelf` });
      books = mergeShelfProgress(books, JSON.parse(r.text));
    } catch (err) {
      // 进度是增强信息，拿不到也不能让整个书架失败。
      this.logger?.warn?.('weread: shelf/sync progress merge failed', err?.message ?? err);
    }
    return books;
  }

  async bookInfo(bookId) {
    return this._postJson(`${BASE}/web/book/info?bookId=${encodeURIComponent(bookId)}`, undefined);
  }

  async catalog(bookId) {
    const referer = readerUrl(bookId);
    const payload = await this._postJson(`${BASE}/web/book/chapterInfos`, { bookIds: [bookId] }, referer);
    const { chapters } = normalizeChapterInfos(payload, bookId);
    // chapterInfos 的每一项不含 chapterIdx，WeRead 的 ci 是「完整章节列表中的序号」。
    // 先给每个章节打上原始序号，再过滤掉封面/空章节，避免 ci 与 WeRead 对不上。
    const indexed = chapters.map((ch, i) => ({
      ...ch,
      chapterIdx: (ch.chapterIdx != null && ch.chapterIdx !== '') ? ch.chapterIdx : i,
    }));
    return indexed
      .filter((ch) => Number(ch.wordCount || 0) > 0 && String(ch.title || '') !== '封面')
      .map((ch) => ({
        chapterUid: ch.chapterUid,
        chapterIdx: ch.chapterIdx,
        title: ch.title || '',
        wordCount: ch.wordCount || 0,
        level: ch.level ?? 0,
        price: ch.price ?? 0,
        paid: ch.paid ?? false,
      }));
  }

  async getProgress(bookId) {
    const r = await this._request(`${BASE}/web/book/getprogress?bookId=${encodeURIComponent(bookId)}`);
    const gp = JSON.parse(r.text);
    const book = (gp && gp.book) || {};
    return {
      chapterUid: book.chapterUid ?? 0,
      chapterOffset: book.chapterOffset ?? 0,
      chapterIdx: book.chapterIdx ?? 0,
      progress: book.progress ?? 0,
      summary: book.summary ?? '',
      synckey: book.synckey ?? 0,
      appId: book.appId ?? '',
    };
  }

  async readerState(bookId, chapterUid = null) {
    const url = readerUrl(bookId, chapterUid);
    const html = await this._getText(url, url);
    const state = extractInitialState(html);
    const reader = (state && state.reader) || {};
    const bookInfo = reader.bookInfo || {};
    return {
      bookId: String(bookInfo.bookId || bookId),
      title: bookInfo.title || bookId,
      author: bookInfo.author || '',
      psvts: reader.psvts || '',
      pclts: reader.pclts || '',
      token: reader.token || '',
      currentChapter: reader.currentChapter || {},
      progress: reader.progress || {},
    };
  }

  async chapter(bookId, chapterUid) {
    const referer = readerUrl(bookId, chapterUid);
    const rs = await this.readerState(bookId, chapterUid);
    const psvts = rs.psvts;
    if (!psvts) throw new Error(`Missing psvts for chapterUid=${chapterUid}`);

    const post = async (endpoint, style = false) => {
      const params = makeContentParams(bookId, chapterUid, psvts, { style, sc: 1 });
      const r = await this._request(`${BASE}${endpoint}`, {
        method: 'POST',
        body: params,
        referer,
      });
      if (r.text === '{}') throw new Error(`${endpoint} returned empty object`);
      return r.text;
    };

    const e0 = await post('/web/book/chapter/e_0');
    if (e0.startsWith('{') && e0.includes('"bookId"')) {
      // 纯文本格式：改用 t_0 / t_1
      const t0 = await post('/web/book/chapter/t_0');
      let t1 = '';
      try {
        t1 = await post('/web/book/chapter/t_1');
      } catch {
        /* 无 t_1 */
      }
      const plain = decodeContentShards(t0, t1, '');
      return { format: 'txt', content: plain, css: '', psvts };
    }

    const e1 = await post('/web/book/chapter/e_1');
    const e3 = await post('/web/book/chapter/e_3');
    const content = decodeContentShards(e0, e1, e3);
    let css = '';
    try {
      css = decodeStyleShard(await post('/web/book/chapter/e_2', true));
    } catch {
      /* 无样式分片 */
    }
    return { format: 'epub', content: extractBody(content), css, psvts };
  }

  async reportProgress({
    bookId,
    chapterUid,
    chapterIdx,
    chapterOffset,
    progress,
    summary,
    elapsedSeconds,
  }) {
    const rs = await this.readerState(bookId, chapterUid);
    const payload = makeReadParams({
      bookId,
      chapterUid,
      chapterIdx,
      chapterOffset,
      progress,
      summary,
      psvts: rs.psvts,
      pclts: rs.pclts,
      token: rs.token,
      elapsedSeconds,
    });
    return this._postJson(`${BASE}/web/book/read`, payload, readerUrl(bookId, chapterUid));
  }
}
