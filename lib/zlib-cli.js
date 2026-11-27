import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { unzipSync } from 'fflate';

const exec = promisify(execFile);
const release = '0.0.15';
// GitHub asset digests for the upstream release. These cover the whole archive.
const digests = {
  darwin_arm64: '0bb4e05a0e0ef997f4a70c83d91f68ebc2750854159f58b2080778542b1ef6c8',
  darwin_x86_64: 'e00dc4f9579de96ea83b8580dd2b7a3849fdac488ad5260938437edaf279ed92',
  linux_arm64: '57027af6cfa992f8af23ad81d0abcaad74726d5b5050e4d55c8b1cbcfeb05914',
  linux_x86_64: 'f0861affa8473cfb50f2224c1d937e019a49f7725a99ef60e7b9058e1c80b309',
  windows_arm64: '727f6b3b04130dded858b8c8a9f31e51cc65ac1c865cf5b621f877d66b4327df',
  windows_x86_64: '6b5a8d805631eba0acf4e8783e0dede8119f4abe3a59d8a079ad2ecd46245c8d',
};

const windows = process.platform === 'win32';
const binary = windows ? 'zlib.exe' : 'zlib';
const assetPlatform = windows ? 'windows' : process.platform;
const assetArch = process.arch === 'x64' ? 'x86_64' : process.arch;
const asset = `${assetPlatform}_${assetArch}`;
const managedBinary = join(homedir(), '.config', 'dsh-weread', 'zlib', release, binary);
export const canInstallZlib = Object.hasOwn(digests, asset);

export async function zlibCommand() {
  try {
    await access(managedBinary, constants.X_OK);
    return managedBinary;
  } catch {
    return binary;
  }
}

export function zlibOptions(cwd = homedir()) {
  const path = process.platform === 'darwin'
    ? [process.env.PATH, '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'].filter(Boolean).join(delimiter)
    : process.env.PATH;
  return { cwd, env: { ...process.env, PATH: path, NO_COLOR: '1' }, windowsHide: true };
}

export async function runZlib(args, { cwd, signal, timeout = 30_000, stage, json = true } = {}) {
  let stdout;
  try {
    ({ stdout } = await exec(await zlibCommand(), args, {
      ...zlibOptions(cwd), signal, timeout, maxBuffer: 2 * 1024 * 1024,
    }));
  } catch (err) {
    signal?.throwIfAborted();
    if (err.code === 'ENOENT') throw new Error('zlib.install');
    if (err.killed) throw new Error(stage === 'import' ? 'zlib.importTimeout' : 'zlib.timeout');
    // Never return CLI output, which may contain account details.
    const diagnostic = String(err.stderr || '');
    if (/not logged in to WeRead|WeRead session expired/i.test(diagnostic)) throw new Error('zlib.wereadLogin');
    if (err.code === 3) throw new Error(stage === 'account' ? 'zlib.wereadLogin' : 'zlib.login');
    if (/verification in its official app/i.test(diagnostic)) throw new Error('zlib.verify');
    if (/import limit reached/i.test(diagnostic)) throw new Error('zlib.importLimit');
    if (/download limit|download quota/i.test(diagnostic)) throw new Error('zlib.downloadLimit');
    if (/did not confirm the import/i.test(diagnostic)) throw new Error('zlib.importTimeout');
    throw new Error(`zlib.${stage}Failed`);
  }
  if (!json) return stdout.trim();
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error('zlib.response');
  }
}

export async function zlibVersion(signal) {
  const output = await runZlib(['version'], { stage: 'setup', signal, json: false, timeout: 5000 });
  const version = /^zlib version v(\d+)\.(\d+)\.(\d+)(?:\s|$)/.exec(output);
  if (!version) return '';
  const [, major, minor, patch] = version;
  return Number(major) || Number(minor) || Number(patch) >= 14 ? `v${major}.${minor}.${patch}` : '';
}

export async function installZlib(signal) {
  if (!canInstallZlib) throw new Error('zlib.setupUnsupported');

  const timeout = AbortSignal.timeout(120_000);
  const downloadSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let directory;
  try {
    const url = `https://github.com/heartleo/zlib/releases/download/v${release}/zlib_${release}_${asset}.mcpb`;
    const response = await fetch(url, { signal: downloadSignal });
    if (!response.ok || !response.body) throw new Error();
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 12 * 1024 * 1024) throw new Error();
      chunks.push(chunk);
    }
    const archive = Buffer.concat(chunks, size);
    const digest = createHash('sha256').update(archive).digest('hex');
    if (digest !== digests[asset]) throw new Error();
    const entry = `server/${binary}`;
    const executable = unzipSync(archive, { filter: (file) => file.name === entry })[entry];
    if (!executable?.length) throw new Error();

    const target = dirname(managedBinary);
    await mkdir(target, { recursive: true, mode: 0o700 });
    directory = await mkdtemp(join(target, '.install-'));
    const temporary = join(directory, binary);
    await writeFile(temporary, executable, { mode: 0o700, flag: 'wx' });
    downloadSignal.throwIfAborted();
    await rename(temporary, managedBinary);
  } catch {
    signal?.throwIfAborted();
    throw new Error('zlib.setupInstallFailed');
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
