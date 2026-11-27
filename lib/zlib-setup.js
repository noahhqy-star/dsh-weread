import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { canInstallZlib, installZlib, runZlib, zlibCommand, zlibOptions, zlibVersion } from './zlib-cli.js';

// Exact hosts from the pinned upstream version. Only these hosts receive a password.
const loginHosts = new Set([
  '1lib.sk', 'article.sk', 'articles.sk', 'z-lib.by', 'z-lib.fm', 'z-lib.gd', 'z-lib.gl',
  'z-lib.sk', 'z-library.ec', 'z-library.im', 'z-library.qa', 'z-library.sk', 'z-library.website', 'zlib.bz',
]);

async function localConfig(name) {
  try {
    return JSON.parse(await readFile(join(homedir(), '.config', 'zlib', name), 'utf8'));
  } catch {
    return null;
  }
}

function loginOrigin(value) {
  if (typeof value !== 'string') return '';
  const url = URL.canParse(value) ? new URL(value) : null;
  return url && url.protocol === 'https:' && !url.username && !url.password && !url.port
    && loginHosts.has(url.hostname) ? url.origin : '';
}

async function signIn(payload, signal) {
  const domain = loginOrigin(payload?.domain);
  const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
  const password = payload?.password;
  if (!domain || domain !== payload?.domain || !email || email.length > 254 || !email.includes('@')
      || typeof password !== 'string' || !password || password.length > 1024) {
    throw new Error('zlib.setupInvalidLogin');
  }

  let directory;
  try {
    const timeout = AbortSignal.timeout(20_000);
    const response = await fetch(new URL('/eapi/user/login', domain), {
      method: 'POST', redirect: 'error', signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { accept: 'application/json' }, body: new URLSearchParams({ email, password }),
    });
    if (!response.ok) throw new Error();
    const result = await response.json();
    const userId = result?.user?.id;
    const id = typeof userId === 'string' || Number.isSafeInteger(userId) ? String(userId) : '';
    const key = result?.user?.remix_userkey || result?.user?.remix_user_key;
    if (result?.success !== 1 || !/^\d{1,20}$/.test(id) || typeof key !== 'string'
        || !/^[!-~]{1,1024}$/.test(key)) {
      throw new Error();
    }

    // Use the CLI's supported import so the password never appears in argv.
    directory = await mkdtemp(join(tmpdir(), 'dsh-weread-login-'));
    const cookieFile = join(directory, 'session.txt');
    const host = new URL(domain).hostname;
    await writeFile(cookieFile, [
      '# Netscape HTTP Cookie File',
      `${host}\tFALSE\t/\tTRUE\t0\tremix_userid\t${id}`,
      `${host}\tFALSE\t/\tTRUE\t0\tremix_userkey\t${key}`,
      '',
    ].join('\n'), { mode: 0o600, flag: 'wx' });
    await runZlib(['login', '--domain', domain, '--cookies', cookieFile], {
      stage: 'setupLogin', json: false, signal,
    });
  } catch {
    signal?.throwIfAborted();
    throw new Error('zlib.setupLoginFailed');
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

export function renderTerminalQr(output) {
  const lines = stripVTControlCharacters(output).replaceAll('\r', '').split('\n');
  const hintIndex = lines.findIndex((line) => line.startsWith('Scan this code with WeChat'));
  if (hintIndex < 0) return '';
  const rows = lines.slice(0, hintIndex);
  const size = rows[0]?.length ?? 0;
  if (size < 28 || size > 186 || rows.length * 2 !== size
      || !rows.every((row) => row.length === size && /^[ █▀▄]+$/.test(row))) return '';

  const modules = [];
  rows.forEach((row, index) => {
    for (let column = 0; column < size; column++) {
      const pixel = row[column];
      if (pixel === '█' || pixel === '▀') modules.push(`M${column} ${index * 2}h1v1h-1z`);
      if (pixel === '█' || pixel === '▄') modules.push(`M${column} ${index * 2 + 1}h1v1h-1z`);
    }
  });
  if (!modules.length) return '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${modules.join('')}"/></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

async function scanWeRead(task, signal) {
  const command = await zlibCommand();
  await new Promise((resolve, reject) => {
    const child = spawn(command, ['weread', 'login'], {
      ...zlibOptions(), signal, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (task.qr) return;
      output += chunk;
      if (output.length > 64 * 1024) {
        child.kill();
        reject(new Error('zlib.setupQrFailed'));
        return;
      }
      task.qr = renderTerminalQr(output);
      if (task.qr) output = '';
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      if (chunk.includes('Scanned.')) task.scanned = true;
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0 && task.qr) resolve();
      else reject(new Error('zlib.setupQrFailed'));
    });
  });
}

export function createZlibSetup(preferences, getWeReadAccount) {
  let active = false;
  let scan = null;
  const lifetime = new AbortController();
  const signalFor = (signal) => signal ? AbortSignal.any([signal, lifetime.signal]) : lifetime.signal;

  async function enabled() {
    return (await preferences.load())?.enabled === true;
  }

  async function requireEnabled() {
    if (!await enabled()) throw new Error('zlib.setupDisabled');
  }

  async function status(signal) {
    const isEnabled = await enabled();
    const view = { enabled: isEnabled, installSupported: canInstallZlib, version: '', signedIn: false, delivery: 'missing' };
    if (!isEnabled) return view;
    try {
      view.version = await zlibVersion(signalFor(signal));
    } catch {
      signal?.throwIfAborted();
      return view;
    }
    if (!view.version) return view;
    const [session, account, accountId] = await Promise.all([
      localConfig('session.json'), localConfig('weread.json'), getWeReadAccount(),
    ]);
    view.signedIn = Boolean(session?.cookies?.remix_userid && session.cookies.remix_userkey);
    if (accountId && account?.vid && account.refresh_token && account.device_id) {
      view.delivery = String(account.vid) === accountId ? 'linked' : 'mismatch';
    }
    return view;
  }

  async function exclusive(operation) {
    if (active || scan?.phase === 'waiting') throw new Error('zlib.setupBusy');
    active = true;
    try {
      return await operation();
    } finally {
      active = false;
    }
  }

  function stopScan() {
    scan?.controller.abort();
    scan = null;
  }

  return {
    enabled,
    requireEnabled,
    status,
    async setEnabled(payload, signal) {
      if (typeof payload?.enabled !== 'boolean') throw new Error('zlib.setupUnavailable');
      if (!payload.enabled) stopScan();
      return exclusive(async () => {
        if (!await preferences.save({ enabled: payload.enabled })) throw new Error('zlib.setupUnavailable');
        return status(signal);
      });
    },
    async install(signal) {
      return exclusive(async () => {
        await requireEnabled();
        if (!(await status(signal)).version) await installZlib(signalFor(signal));
        return status(signal);
      });
    },
    async domains(signal) {
      await requireEnabled();
      const result = await runZlib(['doctor', '--json'], { stage: 'setupDomains', signal: signalFor(signal), timeout: 45_000 });
      const domains = Array.isArray(result) ? result.map((item) => loginOrigin(item?.final_url)) : [];
      return { domains: [...new Set(domains.filter(Boolean))] };
    },
    async login(payload, signal) {
      return exclusive(async () => {
        await requireEnabled();
        await signIn(payload, signalFor(signal));
        return status(signal);
      });
    },
    async startScan(requestSignal) {
      return exclusive(async () => {
        await requireEnabled();
        const view = await status(requestSignal);
        if (!view.version || !view.signedIn || !await getWeReadAccount()) throw new Error('zlib.setupQrFailed');
        requestSignal?.throwIfAborted();
        const controller = new AbortController();
        const task = { id: randomUUID(), phase: 'waiting', controller, qr: '', scanned: false };
        scan = task;
        const signal = AbortSignal.any([controller.signal, lifetime.signal, AbortSignal.timeout(210_000)]);
        void scanWeRead(task, signal).then(
          () => { task.phase = 'done'; task.qr = ''; },
          () => { task.phase = 'failed'; task.qr = ''; },
        );
        return { id: task.id };
      });
    },
    async pollScan(payload) {
      await requireEnabled();
      if (!scan || payload?.id !== scan.id) return { phase: 'failed' };
      return { phase: scan.phase, qr: scan.qr, scanned: scan.scanned };
    },
    cancelScan(payload) {
      if (scan && payload?.id === scan.id) stopScan();
    },
    dispose() {
      lifetime.abort();
      stopScan();
    },
  };
}
