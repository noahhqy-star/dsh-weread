// 微信读书 host 插件入口
// 只注入 DSH 公共服务（connection / webServer / credentials），不 import 任何 @deepseek-ai 内部模块。
import { WeReadService } from './weread.js';
import { createStore, AUTH_KEY, IDENTITY_KEY } from './store.js';
import { installWereadRpc } from './rpc.js';
import { createZlibService } from './zlib.js';

export const name = 'weread';
export const inject = ['connection', 'webServer', 'credentials'];

export function apply(ctx, config = {}) {
  const logger = ctx.logger?.(name) ?? console;
  const authStore = createStore(ctx.credentials, AUTH_KEY, logger);
  const identityStore = createStore(ctx.credentials, IDENTITY_KEY, logger);
  const service = new WeReadService(authStore, identityStore, logger);

  const disposers = [];

  const searchPreferences = createStore(ctx.credentials, 'weread/search-settings', logger);
  const zlib = createZlibService(() => service.accountId(), searchPreferences);
  disposers.push(() => zlib.setup.dispose());
  const disposeRpc = installWereadRpc(ctx, service, logger, zlib);
  if (typeof disposeRpc === 'function') disposers.push(disposeRpc);

  ctx.effect(
    () => async () => {
      for (const d of disposers.reverse()) {
        try {
          await d();
        } catch {
          /* 已清理 */
        }
      }
    },
    'weread: dispose rpc',
  );
}
