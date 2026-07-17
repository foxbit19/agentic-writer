const DRAFT_REVISION_PREFIX = /^\[REV\.\s*\d+\]\s*/i;

/** Strips a legacy workflow-added `[REV. NNN]` prefix from a display title. */
export function stripDraftRevisionPrefix(title: string): string {
  return title.replace(DRAFT_REVISION_PREFIX, '').trim();
}

/** Removes a legacy draft revision prefix from the H1 (older drafts may still have it). */
export function stripDraftRevisionFromMarkdown(markdown: string): string {
  return markdown.replace(/^#\s+(.+)$/m, (_match, title: string) => {
    const cleanTitle = stripDraftRevisionPrefix(title.trim());
    return `# ${cleanTitle}`;
  });
}

/** Extracts a display title and body text from Markdown produced by the article workflow. */
export function parseMarkdownArticle(markdown: string): { title: string; textContent: string } {
  const textContent = markdown.trim();
  const titleMatch = textContent.match(/^#\s+(.+)$/m);
  const rawTitle = titleMatch
    ? titleMatch[1].replace(/\*\*|__|\*|_|`/g, '').trim()
    : 'Untitled article';
  const title = stripDraftRevisionPrefix(rawTitle) || 'Untitled article';

  return { title, textContent };
}
