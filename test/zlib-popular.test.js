import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchChinesePopular } from '../lib/zlib.js';

test('Chinese popular uses the EAPI source header and keeps only Chinese books', async (t) => {
  const chineseBook = { title: '活着', language: 'Chinese' };
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.href, 'https://example.invalid/eapi/book/search');
    assert.equal(options.method, 'POST');
    assert.equal(options.body.get('order'), 'popular');
    assert.equal(options.body.get('languages[0]'), 'chinese');
    if (new Headers(options.headers).get('source') !== 'android') {
      return Response.json({ success: 0, error: 'Access denied' }, { status: 400 });
    }
    return Response.json({ success: 1, books: [chineseBook, { title: 'The Hobbit', language: 'English' }] });
  });

  assert.deepEqual(await fetchChinesePopular('https://example.invalid'), [chineseBook]);
  assert.equal(fetch.mock.callCount(), 1);
});
