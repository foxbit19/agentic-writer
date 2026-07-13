import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { resolveResultUrl, searchWeb } from '../tools/web-search-tool';

describe('resolveResultUrl', () => {
  it('unwraps DuckDuckGo uddg redirect links', () => {
    const wrapped =
      '//duckduckgo.com/l/?uddg=' +
      encodeURIComponent('https://example.com/page?q=1') +
      '&rut=abc';
    assert.equal(resolveResultUrl(wrapped), 'https://example.com/page?q=1');
  });

  it('returns absolute hrefs unchanged when there is no uddg param', () => {
    assert.equal(resolveResultUrl('https://example.com/direct'), 'https://example.com/direct');
  });

  it('returns the raw href when parsing fails', () => {
    assert.equal(resolveResultUrl('not a url'), 'not a url');
  });
});

describe('searchWeb', () => {
  const mockFetchHtml = (html: string) => {
    mock.method(globalThis, 'fetch', async () => new Response(html, { status: 200 }));
  };

  afterEach(() => {
    mock.restoreAll();
  });

  it('throws on a DuckDuckGo bot-detection page instead of returning empty results', async () => {
    mockFetchHtml('<html><body class="anomaly-modal">Unfortunately, bots use DuckDuckGo too.</body></html>');
    await assert.rejects(searchWeb('any query', 5), /rate-limited/);
  });

  it('returns empty results for a genuine empty SERP', async () => {
    mockFetchHtml('<html><body>DuckDuckGo — no results for this query.</body></html>');
    assert.deepEqual(await searchWeb('zxqv nonsense', 5), { results: [] });
  });
});
