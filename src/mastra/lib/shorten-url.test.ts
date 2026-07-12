import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { shortenUrl } from './shorten-url';

const LONG_URL = 'https://example.com/blog/some-post';
const originalKey = process.env.DUB_API_KEY;

describe('shortenUrl', () => {
  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.DUB_API_KEY;
    } else {
      process.env.DUB_API_KEY = originalKey;
    }
    mock.restoreAll();
  });

  it('returns the original URL without calling Dub when DUB_API_KEY is unset', async () => {
    delete process.env.DUB_API_KEY;
    const fetchMock = mock.method(globalThis, 'fetch', async () => {
      throw new Error('fetch should not be called');
    });

    assert.equal(await shortenUrl(LONG_URL), LONG_URL);
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it('returns the shortLink from a successful upsert, sent as PUT', async () => {
    process.env.DUB_API_KEY = 'test-key';
    const fetchMock = mock.method(
      globalThis,
      'fetch',
      async () => new Response(JSON.stringify({ shortLink: 'https://dub.sh/some-post' }), { status: 200 }),
    );

    assert.equal(await shortenUrl(LONG_URL), 'https://dub.sh/some-post');
    assert.equal(fetchMock.mock.callCount(), 1);
    const [, init] = fetchMock.mock.calls[0].arguments;
    assert.equal(init?.method, 'PUT');
  });

  it('falls back to the original URL when the API errors', async () => {
    process.env.DUB_API_KEY = 'test-key';
    mock.method(globalThis, 'fetch', async () => new Response('rate limited', { status: 429 }));
    const warnMock = mock.method(console, 'warn', () => {});

    assert.equal(await shortenUrl(LONG_URL), LONG_URL);
    assert.equal(warnMock.mock.callCount(), 1);
  });
});
