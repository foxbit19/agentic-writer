/** Extracts a display title and body text from MDX produced by the article workflow. */
export function parseMdxArticle(mdx: string): { title: string; textContent: string } {
  const textContent = mdx.trim();
  const titleMatch = textContent.match(/^#\s+(.+)$/m);
  const title = titleMatch
    ? titleMatch[1].replace(/\*\*|__|\*|_|`/g, '').trim()
    : 'Untitled article';

  return { title, textContent };
}
