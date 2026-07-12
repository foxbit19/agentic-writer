import { decodeHtmlEntities } from '../lib/html';
import { readTextCapped, SAFE_FETCH_MAX_BYTES, safeFetch } from '../lib/safe-fetch';

const MAX_ARTICLE_CHARS = 20000;

export interface ArticleContent {
  url: string;
  title: string;
  textContent: string;
  wordCount: number;
}

/**
 * Fetches a URL and extracts readable plain text from it. This is deterministic
 * (no LLM involved) so it's called directly from the workflow step rather than
 * exposed as an agent tool - nothing needs to decide *whether* to read the article,
 * the workflow always does it exactly once.
 *
 * Uses SSRF-safe fetch (public http(s) only, redirect re-check, timeout, size cap).
 *
 * @param url - Absolute http(s) URL of the page to read
 */
export async function readArticle(url: string): Promise<ArticleContent> {
  const response = await safeFetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; agentic-writer/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article at ${url}: ${response.status}`);
  }

  const html = await readTextCapped(response, SAFE_FETCH_MAX_BYTES);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : url;

  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const textContent = decodeHtmlEntities(withoutNoise.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ARTICLE_CHARS);

  if (!textContent) {
    throw new Error(`No readable text content found at ${url}`);
  }

  return {
    url,
    title,
    textContent,
    wordCount: textContent.split(/\s+/).filter(Boolean).length,
  };
}
