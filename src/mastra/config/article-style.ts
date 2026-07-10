/**
 * Mandatory article-writing style for Markdown output. Injected into the Writer and Editor agents.
 */
export const articleStyle = {
  title:
    'H1 in sentence case, not Title Case (e.g. "GPT-5.6 Sol: what actually matters for developers"). Keep proper nouns and acronyms as-is.',
  voice:
    'Write in the first person as the author named in the profile — not as an AI assistant. Never use phrases like "In this article, we will…", "This post explores…", or detached third-person narration.',
  opening:
    'Opening 1–2 paragraphs tease the rest of the article with a punchy, intriguing recap. Body sections stay evidence-based and direct — no filler hype.',
  prose:
    'Do not use em dashes or " - " as clause separators in prose. Use periods, commas, or colons instead. Bullet lists (- item) in body sections are fine.',
  code:
    'Use fenced Markdown code blocks for any code, CLI commands, config, or structured samples. Inline backticks only for short identifiers.',
  references:
    'Always end with a ## References section — markdown links to every source cited. Do not scatter Sources: blocks mid-article.',
} as const;

export function formatArticleStyle(): string {
  return `- Title: ${articleStyle.title}
- Voice: ${articleStyle.voice}
- Opening: ${articleStyle.opening}
- Prose: ${articleStyle.prose}
- Code: ${articleStyle.code}
- References: ${articleStyle.references}`;
}

export const articleMarkdownSkeleton = `# Sentence case title

[Opening: intriguing 1–2 paragraph recap]

## Section …

## References
- [Title](url)`;
