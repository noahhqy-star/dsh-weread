// 微信读书凭证持久化：通过 DSH credentials 服务存 grant record。
// key 段必须匹配 /^[a-z][a-z0-9-]*$/。

/**
 * @param {object} credentials ctx.credentials（注入的 credentials 服务）
 * @param {string} key 形如 "weread/auth"
 * @param {object} logger
 */
export function createStore(credentials, key, logger = console) {
  const warn = (msg, err) => logger?.warn?.(`weread-store: ${msg}`, err);

  async function load() {
    try {
      const record = await credentials.readRecord(key);
      if (record && record.kind === 'grant') return record.payload ?? null;
      return null;
    } catch (err) {
      warn('读取凭证失败', err);
      return null;
    }
  }

  async function save(payload) {
    try {
      await credentials.modifyRecord(key, async () => ({ kind: 'grant', payload }));
      return true;
    } catch (err) {
      warn('保存凭证失败', err);
      return false;
    }
  }

  async function clear() {
    try {
      await credentials.deleteRecord(key);
      return true;
    } catch (err) {
      warn('清除凭证失败', err);
      return false;
    }
  }

  return { key, load, save, clear };
}

export const AUTH_KEY = 'weread/auth';
export const IDENTITY_KEY = 'weread/identity';
