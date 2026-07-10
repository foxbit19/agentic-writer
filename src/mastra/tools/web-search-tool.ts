import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { decodeHtmlEntities, stripTags } from '../lib/html';

const RESULT_REGEX =
  /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;

function resolveResultUrl(rawHref: string): string {
  // DuckDuckGo's HTML results wrap the real URL behind a redirect link,
  // e.g. //duckduckgo.com/l/?uddg=<encoded-url>&rut=...
  try {
    const href = rawHref.startsWith('//') ? `https:${rawHref}` : rawHref;
    const url = new URL(href);
    const uddg = url.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : href;
  } catch {
    return rawHref;
  }
}

export const webSearchTool = createTool({
  id: 'web-search',
  description:
    'Search the public web (including forums, blogs, and social platforms via site: filters) for a query and return matching page titles, URLs, and snippets. Use site:reddit.com, site:x.com, site:youtube.com, etc. to target social media.',
  inputSchema: z.object({
    query: z.string().describe('The search query, e.g. "topic site:reddit.com"'),
    maxResults: z.number().int().min(1).max(10).default(5).describe('Maximum number of results to return'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      }),
    ),
  }),
  execute: async (inputData) => {
    return await searchWeb(inputData.query, inputData.maxResults);
  },
});

const searchWeb = async (query: string, maxResults: number) => {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; agentic-writer/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Web search failed with status ${response.status}`);
  }

  const html = await response.text();
  const results: { title: string; url: string; snippet: string }[] = [];

  for (const match of html.matchAll(RESULT_REGEX)) {
    const [, rawHref, rawTitle, rawSnippet] = match;
    results.push({
      title: stripTags(rawTitle),
      url: resolveResultUrl(rawHref),
      snippet: stripTags(rawSnippet),
    });

    if (results.length >= maxResults) {
      break;
    }
  }

  return { results };
};
