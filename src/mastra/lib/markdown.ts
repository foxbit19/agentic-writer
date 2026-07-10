/** Extracts a display title and body text from Markdown produced by the article workflow. */
export function parseMarkdownArticle(markdown: string): { title: string; textContent: string } {
  const textContent = markdown.trim();
  const titleMatch = textContent.match(/^#\s+(.+)$/m);
  const title = titleMatch
    ? titleMatch[1].replace(/\*\*|__|\*|_|`/g, '').trim()
    : 'Untitled article';

  return { title, textContent };
}
