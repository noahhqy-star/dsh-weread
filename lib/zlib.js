import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runZlib as run } from './zlib-cli.js';
import { createZlibSetup } from './zlib-setup.js';

const formats = ['epub', 'pdf', 'mobi', 'azw3', 'txt'];
const bookIdPattern = /^\d{1,20}:[a-z0-9]{1,128}$/i;
const searchOrders = new Set(['bestmatch', 'popular', 'rating']);
const featuredCount = 12;

async function fetchChinesePopular(signal) {
  const settings = await run(['config', '--json'], { signal, stage: 'popular' });
  try {
    const base = new URL(settings.find((item) => item.key === 'ZLIB_DOMAIN')?.value);
    if (base.protocol !== 'https:' || base.username || base.password) throw new Error();
    const timeout = AbortSignal.timeout(15_000);
    // The CLI rejects empty queries. The public search API accepts them with a language filter.
    const response = await fetch(new URL('/eapi/book/search', base), {
      method: 'POST', redirect: 'error',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { accept: 'application/json' },
      body: new URLSearchParams({
        message: '', page: '1', limit: '30', order: 'popular', 'languages[0]': 'chinese',
      }),
    });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (result.success !== 1 || !Array.isArray(result.books)) throw new Error();
    return result.books.filter((book) => String(book?.language).toLowerCase() === 'chinese');
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error('zlib.popularFailed');
  }
}

export function createZlibService(getWeReadAccount, preferences) {
  const setup = createZlibSetup(preferences, getWeReadAccount);
  let importing = false;

  return {
    setup,
    async popular(payload, signal) {
      await setup.requireEnabled();
      const language = payload?.language ?? 'all';
      if (language !== 'all' && language !== 'chinese') throw new Error('zlib.popularFailed');
      const books = language === 'chinese'
        ? await fetchChinesePopular(signal)
        : await run(['most-popular', '--json'], { signal, stage: 'popular' });
      if (!Array.isArray(books)) throw new Error('zlib.response');

      const featured = [];
      const seen = new Set();
      for (const book of books) {
        const name = book?.name ?? book?.title;
        const title = typeof name === 'string' ? name.trim() : '';
        const authors = book?.authors ?? book?.author;
        const author = Array.isArray(authors) ? authors.join(', ') : (typeof authors === 'string' ? authors : '');
        const key = title.toLowerCase();
        if (!title || seen.has(key)) continue;
        seen.add(key);
        featured.push({
          title, author,
          cover: typeof book.cover === 'string' && book.cover.startsWith('https://') ? book.cover : '',
        });
        if (featured.length === featuredCount) break;
      }
      return { books: featured, language };
    },

    async search(payload, signal) {
      await setup.requireEnabled();
      const query = typeof payload?.query === 'string' ? payload.query.trim() : '';
      const page = payload?.page ?? 1;
      const order = payload?.order ?? 'bestmatch';
      const format = payload?.format ?? 'all';
      if (!query || query.length > 200 || query.includes('\0') || !Number.isSafeInteger(page) || page < 1
          || !searchOrders.has(order) || (format !== 'all' && !formats.includes(format))) {
        throw new Error('zlib.invalidSearch');
      }

      const extensions = format === 'all' ? formats : [format];
      const result = await run([
        'search', '--json', '--count', '20', '--page', String(page),
        '--order', order === 'popular' ? 'popular' : 'bestmatch',
        ...extensions.flatMap((extension) => ['--ext', extension]), '--', query,
      ], { signal, stage: 'search' });
      if (!Array.isArray(result?.books)) throw new Error('zlib.response');

      const books = result.books.filter((book) => bookIdPattern.test(book?.id)).map((book) => {
        const rating = Number(book.rating);
        return {
          id: book.id,
          title: book.name || book.title || '',
          author: Array.isArray(book.authors) ? book.authors.join(', ') : book.author || '',
          publisher: book.publisher || '',
          format: String(book.extension || book.format || '').toLowerCase(),
          year: Number(book.year) > 0 ? book.year : '',
          language: book.language || '',
          size: book.size || '',
          rating: rating > 0 && rating <= 5 ? rating : null,
        };
      });
      const matches = format === 'all' ? books : books.filter((book) => book.format === format);
      if (order === 'rating') matches.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      return { books: matches, format, page, hasNext: page < Number(result.totalPages ?? result.total_pages) };
    },

    async importBook(payload, signal) {
      await setup.requireEnabled();
      const id = payload?.id;
      if (typeof id !== 'string' || !bookIdPattern.test(id)) throw new Error('zlib.invalidBook');
      if (importing) throw new Error('zlib.busy');
      importing = true;
      let directory;
      try {
        const account = await getWeReadAccount();
        if (!account) throw new Error('zlib.pluginLogin');
        const deliveryAccount = await run(['weread', 'whoami', '--json'], { signal, stage: 'account' });
        if (String(deliveryAccount?.vid ?? '') !== account || await getWeReadAccount() !== account) {
          throw new Error('zlib.accountMismatch');
        }

        signal?.throwIfAborted();
        directory = await mkdtemp(join(tmpdir(), 'dsh-weread-'));
        // Finish an accepted import even if the browser closes while WeRead is processing it.
        const result = await run(['download', '--send-to-weread', '--json', '--dir', directory, '--', id], {
          cwd: directory, timeout: 300_000, stage: 'import',
        });
        const bookId = String(result?.weread?.book_id ?? '');
        if (result?.weread?.imported !== true || !bookId) throw new Error('zlib.importFailed');
        return { bookId, alreadyExisted: result.weread.already_existed === true };
      } finally {
        try {
          if (directory) await rm(directory, { recursive: true, force: true, maxRetries: 3 });
        } finally {
          importing = false;
        }
      }
    },
  };
}
