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

const CLAIM_MAX_LENGTH = 600;
const PROSE_PARAGRAPH_TARGET = 2;

/** Removes common inline Markdown markup for plain-text extraction. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*|__|\*|_|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/** Returns true when a Markdown block is not usable prose (heading, list, code, rule). */
function isSkippableBlock(block: string): boolean {
  const trimmed = block.trim();
  if (!trimmed) {
    return true;
  }
  if (/^#{1,6}\s/.test(trimmed)) {
    return true;
  }
  if (/^```/.test(trimmed)) {
    return true;
  }
  if (/^---+\s*$/.test(trimmed) || /^\*\*\*+\s*$/.test(trimmed)) {
    return true;
  }
  const lines = trimmed.split('\n').filter((line) => line.trim());
  if (lines.length > 0 && lines.every((line) => /^\s*([-*+]|\d+\.)\s/.test(line))) {
    return true;
  }
  return false;
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

/**
 * Extracts the article's opening claim from the first 1–2 prose paragraphs after the H1.
 *
 * @param markdown - Full article Markdown
 * @returns Plain-text opening claim, or an empty string when no prose is found
 */
export function extractArticleClaim(markdown: string): string {
  const withoutH1 = markdown.replace(/^#\s+.+\n?/m, '').trim();
  const blocks = withoutH1.split(/\n{2,}/);
  const paragraphs: string[] = [];

  for (const block of blocks) {
    if (isSkippableBlock(block)) {
      continue;
    }
    const prose = stripInlineMarkdown(block.replace(/\n/g, ' '));
    if (prose) {
      paragraphs.push(prose);
    }
    if (paragraphs.length >= PROSE_PARAGRAPH_TARGET) {
      break;
    }
  }

  if (paragraphs.length === 0) {
    return '';
  }

  let claim = paragraphs.join(' ');
  if (claim.length > CLAIM_MAX_LENGTH) {
    claim = `${claim.slice(0, CLAIM_MAX_LENGTH - 1).trimEnd()}…`;
  }
  return claim;
}
