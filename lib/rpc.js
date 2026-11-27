// 微信读书 Host RPC：loopback-only 通道 /weread，wire 协议逐字节复刻 dsh-client-connection 的
// /api 信封（client-request → handler → server-response）。DSH 0.2.2-rc.2 上 ctx.connection.rpc.handle
// 已失效，故与 dsh-pocket 一样直接挂到本插件 inject 的 webServer 上。

const WEREAD_RPC_CHANNEL = '/weread';

/** RPC 请求体上限（都是小 JSON 控制载荷）。 */
const WEREAD_RPC_BODY_MAX = 8 * 1024 * 1024;

/** endpoint 段字符（与 dsh-client-connection 的 ENDPOINT_SEGMENT_PATTERN 对齐）。 */
const ENDPOINT_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;

/** client-request 信封校验失败时使用的兜底 rpcId（与 dsh 内部 INVALID_REQUEST_RPC_ID 对齐）。 */
const INVALID_REQUEST_RPC_ID = 'invalid-request';

const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1']);

function endpointFromPath(channel, pathname) {
  if (!pathname.startsWith(`${channel}/`)) return undefined;
  const endpoint = pathname.slice(channel.length + 1);
  if (endpoint.split('/').some((seg) => seg === '' || seg === '.' || seg === '..' || !ENDPOINT_SEGMENT_PATTERN.test(seg))) {
    return undefined;
  }
  return endpoint;
}

function serverResponseJson(rpcId, result) {
  return JSON.stringify({ type: 'server-response', rpcId, result });
}

function isTrustedLoopbackRequest(req) {
  const host = req.headers?.host;
  if (!host) return false;
  const hostName = host.split(':')[0];
  if (!LOOPBACK_HOSTNAMES.has(hostName)) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function pocketFetchHandler(channel, handler, log) {
  return {
    async fetch(request) {
      const endpoint = endpointFromPath(channel, new URL(request.url).pathname);
      if (request.method !== 'POST' || endpoint === undefined) {
        return new Response('not found', { status: 404 });
      }
      const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
      if (mediaType !== 'application/json') {
        return new Response('content type must be application/json', { status: 415 });
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response('body is not JSON', { status: 400 });
      }
      const rpcId = body && typeof body.rpcId === 'string' ? body.rpcId : INVALID_REQUEST_RPC_ID;
      const method = body && typeof body.method === 'string' ? body.method : null;
      if (rpcId === INVALID_REQUEST_RPC_ID || method === null) {
        return new Response(
          serverResponseJson(INVALID_REQUEST_RPC_ID, {
            ok: false,
            error: { code: 'bad-request', message: 'invalid client-request message', details: { issues: [] } },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (method !== endpoint) {
        return new Response(
          serverResponseJson(rpcId, {
            ok: false,
            error: {
              code: 'bad-request',
              message: `method ${JSON.stringify(method)} does not match endpoint ${JSON.stringify(endpoint)}`,
              details: { issues: [] },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      try {
        const result = await handler(endpoint, body.payload, request.signal);
        return new Response(serverResponseJson(rpcId, result), {
          status: 200,
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      } catch (err) {
        log.error?.('weread: rpc %s failed | RPC 失败: %s', endpoint, err?.message ?? err);
        return new Response(`handler failure: ${String(err)}`, { status: 500 });
      }
    },
  };
}

async function pocketHttpBridge(req, res, fetchHandler, maxBodyBytes) {
  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abort.abort();
  });

  const declaredLen = req.headers['content-length'];
  if (declaredLen !== undefined && Number(declaredLen) > maxBodyBytes) {
    res.writeHead(413, { connection: 'close' });
    res.end();
    req.destroy();
    return;
  }
  const chunks = [];
  let received = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > maxBodyBytes) {
      tooLarge = true;
      break;
    }
    chunks.push(chunk);
  }
  if (tooLarge) {
    res.writeHead(413, { connection: 'close' });
    res.end();
    req.destroy();
    return;
  }

  const url = `http://${req.headers.host ?? '127.0.0.1'}${req.url}`;
  const init = {
    method: req.method ?? 'GET',
    headers: Object.fromEntries(Object.entries(req.headers).filter(([, v]) => typeof v === 'string')),
    signal: abort.signal,
  };
  if (chunks.length > 0) init.body = Buffer.concat(chunks);
  const request = new Request(url, init);

  const response = await fetchHandler.fetch(request);
  const headers = Object.fromEntries(response.headers.entries());
  res.writeHead(response.status, headers);
  if (response.body === null) {
    res.end();
    return;
  }
  for await (const chunk of response.body) {
    if (!res.write(chunk)) {
      await new Promise((resolve) => {
        const done = () => {
          res.off('drain', done);
          res.off('close', done);
          resolve();
        };
        res.once('drain', done);
        res.once('close', done);
      });
    }
    if (res.writableEnded) break;
  }
  res.end();
}

function mountWereadWebRoute(ctx, { channel, handler, log }) {
  const webServer = ctx?.webServer;
  if (!webServer || typeof webServer.register !== 'function') return null;
  const connection = ctx?.connection;
  const fetchHandler = pocketFetchHandler(channel, handler, log);
  const route = {
    kind: 'prefix',
    path: channel,
    handler: async (req, res) => {
      let rejection;
      if (typeof connection?.requestRejection === 'function') {
        try {
          rejection = connection.requestRejection(req);
        } catch {
          rejection = 403;
        }
      } else if (!isTrustedLoopbackRequest(req)) {
        rejection = 403;
      }
      if (rejection !== undefined) {
        res.writeHead(rejection, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(rejection === 401 ? 'unauthorized' : 'forbidden');
        return;
      }
      await pocketHttpBridge(req, res, fetchHandler, WEREAD_RPC_BODY_MAX);
    },
  };
  const registered = webServer.register(route);
  const cleanup =
    typeof registered === 'function'
      ? () => {
          try {
            registered();
          } catch {
            /* 已清理 */
          }
        }
      : registered && typeof registered.then === 'function'
        ? (() => {
            let done = false;
            return async () => {
              if (done) return;
              done = true;
              try {
                const d = await registered;
                if (typeof d === 'function') d();
              } catch {
                /* 已清理 */
              }
            };
          })()
        : () => {};
  return cleanup;
}

function ok(value) {
  return { ok: true, value };
}

function fail(code, message) {
  if (code === 'cancelled') return { ok: false, error: { code: 'cancelled', message, details: {} } };
  return { ok: false, error: { code: 'bad-request', message, details: { issues: [{ message }] } } };
}

export function installWereadRpc(ctx, service, log = console, zlib) {
  const handler = async (endpoint, payload = {}, signal) => {
    if (signal?.aborted) return fail('cancelled', 'The request was cancelled.');

    try {
      switch (endpoint) {
        case 'status': {
          const loggedIn = await service.isLoggedIn();
          const value = { loggedIn, searchEnabled: await zlib.setup.enabled() };
          if (loggedIn) {
            try {
              value.shelf = await service.shelf();
            } catch (err) {
              log.warn?.('weread: shelf in status failed', err?.message ?? err);
              value.shelf = [];
            }
          }
          return ok(value);
        }
        case 'loginUid': {
          const info = await service.getLoginUid();
          const uid = info && info.uid ? String(info.uid) : '';
          let qrDataUrl = '';
          if (uid) {
            try {
              qrDataUrl = (await service.qrImageDataUrl(uid)) || '';
            } catch {
              qrDataUrl = '';
            }
          }
          return ok({ uid, qrUrl: uid ? service.qrUrl(uid) : '', qrDataUrl });
        }
        case 'loginPoll': {
          const uid = payload && payload.uid ? String(payload.uid) : '';
          if (!uid) return fail('bad-request', 'loginPoll 需要 uid | loginPoll requires uid');
          const info = await service.getLoginInfo(uid, payload?.otp || '', signal);
          // 始终以 ok 返回轮询状态，由客户端决定如何对待 LOGIN_TIMEOUT / NEED_OTP 等。
          if (info && (info.succeed === true || info.succeed === 1)) {
            return ok({ succeed: true, logicCode: info.logicCode || 'LOGIN_SUCCESS', vid: String(info.webLoginVid ?? info.vid ?? '') });
          }
          return ok({ succeed: false, logicCode: (info && info.logicCode) || 'UNKNOWN' });
        }
        case 'logout': {
          await service.logout();
          return ok({ ok: true });
        }
        case 'shelf': {
          return ok({ books: await service.shelf() });
        }
        case 'zlibSetupStatus':
          return ok(await zlib.setup.status(signal));
        case 'zlibSetupEnable':
          return ok(await zlib.setup.setEnabled(payload, signal));
        case 'zlibSetupInstall':
          return ok(await zlib.setup.install(signal));
        case 'zlibSetupDomains':
          return ok(await zlib.setup.domains(signal));
        case 'zlibSetupLogin':
          return ok(await zlib.setup.login(payload, signal));
        case 'zlibSetupScan':
          return ok(await zlib.setup.startScan(signal));
        case 'zlibSetupPoll':
          return ok(await zlib.setup.pollScan(payload));
        case 'zlibSetupCancel':
          zlib.setup.cancelScan(payload);
          return ok({ cancelled: true });
        case 'zlibSearch': {
          return ok(await zlib.search(payload, signal));
        }
        case 'zlibPopular': {
          return ok(await zlib.popular(payload, signal));
        }
        case 'zlibImport': {
          return ok(await zlib.importBook(payload, signal));
        }
        case 'bookInfo': {
          const bookId = payload && payload.bookId ? String(payload.bookId) : '';
          if (!bookId) return fail('bad-request', 'bookInfo 需要 bookId | bookInfo requires bookId');
          return ok(await service.bookInfo(bookId));
        }
        case 'catalog': {
          const bookId = payload && payload.bookId ? String(payload.bookId) : '';
          if (!bookId) return fail('bad-request', 'catalog 需要 bookId | catalog requires bookId');
          return ok({ chapters: await service.catalog(bookId) });
        }
        case 'getProgress': {
          const bookId = payload && payload.bookId ? String(payload.bookId) : '';
          if (!bookId) return fail('bad-request', 'getProgress 需要 bookId | getProgress requires bookId');
          return ok(await service.getProgress(bookId));
        }
        case 'readerState': {
          const bookId = payload && payload.bookId ? String(payload.bookId) : '';
          if (!bookId) return fail('bad-request', 'readerState 需要 bookId | readerState requires bookId');
          return ok(await service.readerState(bookId, payload?.chapterUid));
        }
        case 'chapter': {
          const bookId = payload && payload.bookId ? String(payload.bookId) : '';
          const chapterUid = payload && payload.chapterUid != null ? payload.chapterUid : '';
          if (!bookId || chapterUid === '') return fail('bad-request', 'chapter 需要 bookId 与 chapterUid | chapter requires bookId and chapterUid');
          return ok(await service.chapter(bookId, chapterUid));
        }
        case 'reportProgress': {
          const bookId = payload && payload.bookId ? String(payload.bookId) : '';
          if (!bookId) return fail('bad-request', 'reportProgress 需要 bookId | reportProgress requires bookId');
          return ok(await service.reportProgress(payload));
        }
        default:
          return fail('bad-request', `未知 endpoint: ${endpoint} | unknown endpoint`);
      }
    } catch (err) {
      if (signal?.aborted) return fail('cancelled', 'The request was cancelled.');
      log.error?.('weread: rpc %s failed | RPC 失败: %s', endpoint, err?.message ?? err);
      return fail('bad-request', err?.message ?? String(err));
    }
  };

  const directMount = mountWereadWebRoute(ctx, { channel: WEREAD_RPC_CHANNEL, handler, log });
  if (directMount) return directMount;

  if (!ctx?.connection?.rpc?.handle) {
    log.warn?.('weread: DSH Host Connection RPC unavailable — reader disabled | 无 Connection RPC，阅读器不可用');
    return () => {};
  }
  return ctx.connection.rpc.handle(WEREAD_RPC_CHANNEL, handler, { authority: 'loopback' });
}
