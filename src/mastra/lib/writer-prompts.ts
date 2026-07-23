/**
 * Prompt assembly for the Writer/Editor steps of the article workflow.
 *
 * Kept as pure functions so tests can assert that every drafting pass —
 * especially revisions — carries the author operating instructions and the
 * author draft. A regression here silently degrades articles: the Writer
 * rebuilds quoted material (code blocks, commands, URLs) from memory instead
 * of copying it verbatim.
 */

const INSTRUCTIONS_HEADER =
  'Author operating instructions (not article body — follow these; do not paste or lightly paraphrase them into the article)';

const GUIDANCE_SEPARATOR = '\n\n---\n\n';

/**
 * Appends a new revision guidance block to existing cumulative guidance.
 *
 * @param existing - Prior editor and/or human guidance, if any
 * @param addition - New guidance to append
 * @returns Combined guidance with blocks separated by a horizontal rule
 */
export function appendRevisionGuidance(existing: string | undefined, addition: string): string {
  const trimmedAddition = addition.trim();
  if (!trimmedAddition) {
    return existing?.trim() ?? '';
  }
  const trimmedExisting = existing?.trim();
  if (!trimmedExisting) {
    return trimmedAddition;
  }
  return `${trimmedExisting}${GUIDANCE_SEPARATOR}${trimmedAddition}`;
}

/**
 * Formats an optional author draft block for Writer/Editor prompts.
 *
 * @param authorDraft - Optional author-written prose from the workflow input
 * @returns A prompt section, or an empty string when no draft was provided
 */
export function authorDraftBlock(authorDraft: string | undefined): string {
  const trimmed = authorDraft?.trim();
  if (!trimmed) return '';
  return `\n\nAuthor draft (develop this prose; it belongs in the article. It is the verbatim source of truth for quoted material — copy code blocks, commands, URLs, and links from it exactly; never invent or alter them):\n${trimmed}`;
}

export interface WriterPromptInput {
  notes: string;
  authorDraft?: string;
  researchBrief: string;
  /** The previous draft (revision passes only), already stripped of revision markers. */
  previousDraft?: string;
  /** Editor and/or human guidance (revision passes only). */
  guidanceNotes?: string;
}

/**
 * Builds the Writer prompt for both the initial draft and revision passes.
 * A pass is a revision when a non-empty previousDraft is provided.
 */
export function buildWriterPrompt(input: WriterPromptInput): string {
  const { notes, authorDraft, researchBrief, previousDraft, guidanceNotes } = input;
  const hasAuthorDraft = Boolean(authorDraft?.trim());
  const preamble = `${INSTRUCTIONS_HEADER}:\n${notes}${authorDraftBlock(authorDraft)}\n\nResearch brief:\n${researchBrief}`;

  if (previousDraft?.trim()) {
    return `${preamble}\n\nPrevious draft:\n${previousDraft}\n\nRevision guidance (operating instructions from the editor and/or the human author — not article body):\n${guidanceNotes ?? ''}\n\nWhen guidance includes both editor and human author notes, prioritize human author notes on any conflict.\n\nRevise the draft to fully address this guidance and return the complete updated Markdown article.${hasAuthorDraft ? ' The author draft above remains the verbatim source of truth for quoted material — re-copy code blocks, commands, URLs, and links from it, not from the previous draft or from memory.' : ''}`;
  }

  return `${preamble}\n\nWrite the article as a complete Markdown document.${hasAuthorDraft ? " Develop and polish the author draft above; do not discard the author's wording unless the instructions say so." : ''}`;
}
