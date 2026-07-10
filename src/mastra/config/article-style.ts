/**
 * Mandatory article-writing style for Markdown output. Injected into the Writer and Editor agents.
 */
export const articleStyle = {
  title:
    'H1 in sentence case, not Title Case (e.g. "GPT-5.6 Sol: what actually matters for developers"). Keep proper nouns and acronyms as-is.',
  voice:
    'Write in the first person as the author named in the profile — not as an AI assistant. Never use phrases like "In this article, we will…", "This post explores…", or detached third-person narration. Avoid arrogant phrasing ("obviously", "you should already know", "the truth is", talking down to the reader). Prefer humble, evidence-led wording ("I found", "in my testing", "the docs say").',
  opening:
    'Opening 1–2 paragraphs inform the reader: what the piece covers, why it matters, and the main thread—grounded in concrete detail from the research. Orient and engage without empty hype, clickbait, or a lecturing tone.',
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

[Opening: informative 1–2 paragraphs — what you learned and why it matters]

## Section …

## References
- [Title](url)`;
