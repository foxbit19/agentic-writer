const DRAFT_REVISION_PREFIX = /^\[REV\.\s*\d+\]\s*/i;

function formatRevisionNumber(draftNumber: number): string {
  return String(draftNumber).padStart(3, '0');
}

/** Strips a workflow-added `[REV. NNN]` prefix from a display title. */
export function stripDraftRevisionPrefix(title: string): string {
  return title.replace(DRAFT_REVISION_PREFIX, '').trim();
}

/** Builds the revision label shown in draft H1 titles, e.g. `[REV. 001]`. */
export function formatDraftRevisionLabel(draftNumber: number): string {
  return `[REV. ${formatRevisionNumber(draftNumber)}]`;
}

/** Adds or updates the `[REV. NNN]` prefix on the article H1. */
export function applyDraftRevisionToMarkdown(markdown: string, draftNumber: number): string {
  const label = formatDraftRevisionLabel(draftNumber);
  return markdown.replace(/^#\s+(.+)$/m, (_match, title: string) => {
    const cleanTitle = stripDraftRevisionPrefix(title.trim());
    return `# ${label} ${cleanTitle}`;
  });
}

/** Removes the draft revision prefix from the H1 for approved output. */
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
