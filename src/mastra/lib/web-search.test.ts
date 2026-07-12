import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveResultUrl } from '../tools/web-search-tool';

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
