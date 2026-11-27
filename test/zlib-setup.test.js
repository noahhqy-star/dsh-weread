import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createZlibService } from '../lib/zlib.js';
import { renderTerminalQr } from '../lib/zlib-setup.js';

test('book search is off by default and disabled at every host entry point', async () => {
  const zlib = createZlibService(async () => null, { load: async () => null });
  try {
    const status = await zlib.setup.status();
    assert.equal(status.enabled, false);
    assert.equal(status.version, '');
    for (const operation of [zlib.search, zlib.popular, zlib.importBook, zlib.setup.install, zlib.setup.login]) {
      await assert.rejects(operation(), /zlib.setupDisabled/);
    }
  } finally {
    zlib.setup.dispose();
  }
});

test('turning off search persists an explicit false value', async () => {
  let saved = { enabled: true };
  const zlib = createZlibService(async () => null, {
    load: async () => saved,
    save: async (next) => { saved = next; return true; },
  });
  try {
    const status = await zlib.setup.setEnabled({ enabled: false });
    assert.deepEqual(saved, { enabled: false });
    assert.equal(status.enabled, false);
  } finally {
    zlib.setup.dispose();
  }
});

test('login rejects a password addressed to an untrusted origin or paths', async () => {
  const zlib = createZlibService(async () => null, { load: async () => ({ enabled: true }) });
  try {
    for (const domain of ['https://127.0.0.1', 'https://z-lib.gd.invalid', 'https://z-lib.gd/other']) {
      await assert.rejects(zlib.setup.login({ domain, email: 'test@example.invalid', password: 'placeholder' }),
        /zlib.setupInvalidLogin/);
    }
  } finally {
    zlib.setup.dispose();
  }
});

test('render the upstream half-block QR format without interpreting terminal output as markup', () => {
  const empty = ' '.repeat(28);
  const rows = [empty, ' ▀▄█'.padEnd(28), ...Array(12).fill(empty)];
  const output = rows.map((row) => '\x1b[30;47m' + row + '\x1b[0m').join('\r\n');
  const caption = '\nScan this code with WeChat';
  const image = renderTerminalQr(output + caption);
  assert.match(image, /^data:image\/svg\+xml;base64,/);
  const svg = Buffer.from(image.split(',')[1], 'base64').toString();
  assert.match(svg, /M1 2h1v1h-1zM2 3h1v1h-1zM3 2h1v1h-1zM3 3h1v1h-1z/);
  assert.equal(renderTerminalQr(output), '');
  assert.equal(renderTerminalQr(output.replace(' ▀▄█', '<a/>') + caption), '');
});
