import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { slugify } from './articles';
import { extractUrls } from './extract-urls';
import {
  assertSafeArticleId,
  assertSafeCampaignId,
  isSafeArticleId,
  isSafeCampaignId,
} from './ids';
import { assertSafePublicUrl, isPrivateIp } from './safe-fetch';

describe('slugify', () => {
  it('lowercases and replaces non-alphanumeric runs with underscores', () => {
    assert.equal(slugify('Hello World!'), 'hello_world');
  });

  it('strips accents via NFKD normalization', () => {
    assert.equal(slugify('Café résumé'), 'cafe_resume');
  });

  it('drops emoji and other symbols', () => {
    assert.equal(slugify('Launch 🚀 day'), 'launch_day');
  });

  it('returns a fallback for empty or punctuation-only titles', () => {
    assert.equal(slugify(''), 'article');
    assert.equal(slugify('!!!'), 'article');
    assert.equal(slugify('   '), 'article');
  });
});

describe('extractUrls', () => {
  it('extracts unique http(s) URLs and trims trailing punctuation', () => {
    const text =
      'See https://example.com/a, and also https://example.com/a again plus http://foo.io/x.';
    assert.deepEqual(extractUrls(text), ['https://example.com/a', 'http://foo.io/x']);
  });

  it('returns an empty list when no URLs are present', () => {
    assert.deepEqual(extractUrls('no links here'), []);
  });

  it('ignores non-http schemes', () => {
    assert.deepEqual(extractUrls('ftp://files.example.com/x and javascript:alert(1)'), []);
  });
});

describe('ids', () => {
  it('accepts article and campaign id shapes used on disk', () => {
    assert.equal(isSafeArticleId('choosing_the_right_model_d9836152'), true);
    assert.equal(isSafeCampaignId('2026-07-12T10-00-00_abcdef12'), true);
  });

  it('rejects path traversal and disallowed characters', () => {
    assert.equal(isSafeArticleId('../etc'), false);
    assert.equal(isSafeArticleId('foo/bar'), false);
    assert.equal(isSafeCampaignId('../../secret'), false);
    assert.throws(() => assertSafeArticleId('../../etc'), /Invalid article id/);
    assert.throws(() => assertSafeCampaignId('bad id'), /Invalid campaign id/);
  });
});

describe('safe-fetch SSRF guards', () => {
  it('flags private and link-local IPv4 ranges', () => {
    assert.equal(isPrivateIp('127.0.0.1'), true);
    assert.equal(isPrivateIp('10.0.0.1'), true);
    assert.equal(isPrivateIp('172.16.5.1'), true);
    assert.equal(isPrivateIp('192.168.1.1'), true);
    assert.equal(isPrivateIp('169.254.169.254'), true);
    assert.equal(isPrivateIp('8.8.8.8'), false);
  });

  it('flags loopback and ULA IPv6 addresses', () => {
    assert.equal(isPrivateIp('::1'), true);
    assert.equal(isPrivateIp('fc00::1'), true);
    assert.equal(isPrivateIp('fe80::1'), true);
  });

  it('rejects non-http schemes and private literal hosts', async () => {
    await assert.rejects(() => assertSafePublicUrl('file:///etc/passwd'), /Unsupported URL scheme/);
    await assert.rejects(() => assertSafePublicUrl('http://127.0.0.1/'), /Blocked private IP/);
    await assert.rejects(
      () => assertSafePublicUrl('http://169.254.169.254/latest/meta-data/'),
      /Blocked private IP/,
    );
    await assert.rejects(() => assertSafePublicUrl('http://localhost/'), /Blocked hostname/);
  });
});
