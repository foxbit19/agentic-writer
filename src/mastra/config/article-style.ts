/**
 * Mandatory article-writing style for Markdown output. Injected into the Writer and Editor agents.
 */
export const articleStyle = {
  title:
    'H1 in sentence case, not Title Case. Name the subject plainly — informative, not evaluative. Good: "GPT-5.6: what OpenAI announced", "Notification inbox: what Mastra shipped". Bad: "how I\'ll judge…", "what actually matters", "the real story", "why X wins", or any title that frames you as the arbiter. When notes include a side question, answer it inside the article; do not turn the title or structure into a personal verdict or rubric.',
  voice:
    'Write in the first person as the author named in the profile — not as an AI assistant. Default article type: informative summary or explainer grounded in the source. Share what the source says and what you took from it — do not lecture, score, or position yourself as judge of the industry. Never use phrases like "In this article, we will…", "This post explores…", "how I\'ll judge/evaluate/decide", "what I need to see", "what would change my mind", "my rubric", or "the only defensible answer". Avoid arrogant phrasing ("obviously", "you should already know", "the truth is", "actually beaten", talking down to the reader). Prefer humble, evidence-led wording ("the post says", "I read that", "one open question is").',
  articleType:
    'Unless author notes explicitly request an opinion piece, review, or hot take, write an informative article: summarize and explain the source material for the reader. Do not substitute a personal evaluation framework, scoring rubric, or "criteria I\'ll use" checklist when notes asked for an informative article based on a link.',
  grounding:
    'Never state facts, features, APIs, statistics, or quotes that are not supported by the research brief or author notes. When notes include source URL(s), the article must reflect only those sources — not general industry knowledge, reference architectures, or generic backend/security best practices the sources did not describe. Prefer a shorter, accurate article over a longer invented one.',
  thinSource:
    'If the research brief is thin or a source fetch failed, write a short honest article stating that. Do not pad with industry best practices, reference architectures, or evaluation frameworks the source did not contain.',
  sourceAttribution:
    'Attribute claims to the source: "OpenAI reports…", "the post says…", "according to the announcement". Never present benchmark numbers or product claims as your own findings.',
  sideQuestion:
    'When notes include a side question (e.g. "is X beaten?"), weave it in naturally — often as a closing section. Do not paste note phrasing verbatim and do not restructure the article as a rubric for judging the industry.',
  notesIntegration:
    'Integrate note intent into natural prose. Do not copy-paste note phrasing, especially question prefixes or meta-instructions (e.g. "Interesting question: …").',
  researchBrief:
    'Do not mirror the research brief\'s outline structure. Translate topics into prose-first sections.',
  personalContent:
    'Preserve and foreground any "personal content to preserve" the Researcher flagged (anecdotes, opinions, first-hand experience) in the author\'s own voice — don\'t flatten it into generic prose.',
  opening:
    'Opening 1–2 paragraphs: what the source covers, why it matters, and the main thread — grounded in concrete detail from the research. Lead with substance from the source, not meta-framing. Say you could not access the post only when the brief confirms fetch failure. Orient without empty hype, clickbait, or a lecturing tone.',
  sectionHeadings:
    '## headings name the topic covered ("Model family and reasoning settings"), not an evaluation framework. Bad: "A rubric I\'ll use", "What I need to see", "What would change my mind", "What would count as…".',
  structure:
    'Informative articles are prose-first essays, not checklists. Every ## section needs at least two full prose paragraphs before any list. Default: no bullet or numbered lists in body sections. Allow at most two short lists (3–5 items each) in the entire article, only for genuinely parallel facts — never for sequential arguments or rubrics. If a section would be mostly bullets, rewrite it as connected paragraphs instead. Avoid "checklist article" framing unless the author notes explicitly request a checklist.',
  flow:
    'Sections should read as one essay: each section builds on the previous. Use transitions; avoid disconnected rubric blocks that could be reordered arbitrarily.',
  length:
    'Default target: ~800–1,500 words unless author notes specify otherwise. For single-link informative articles, target ~600–1,200 words unless notes request depth. If notes ask for an "informative article", "overview", or "explainer" without depth cues, stay on the shorter end. Only expand when notes explicitly request long-form, tutorial, deep-dive, or implementation guide.',
  prose:
    'Do not use em dashes or " - " as clause separators in prose. Use periods, commas, or colons instead.',
  markdown:
    'Use standard Markdown inline formatting in body prose (not in headings). **Bold** (`**text**`) for key terms on first mention, model or product names, and one or two pivotal takeaways per section — never whole sentences or paragraphs. *Italic* (`*text*`) for light emphasis, publication or project names, and short quoted phrases from the source. Inline code (`` `text` ``) for technical identifiers: API names, model IDs, flags, env vars, CLI commands, benchmark IDs, and short code tokens. Do not over-format: most sentences need no markup. Never use HTML tags or single-underscore `_italic_` / single-asterisk bold variants.',
  code:
    'Default: no fenced code blocks (```) in basic or informative articles. Include fenced blocks only when author notes explicitly request code, examples, snippets, CLI samples, or a tutorial. Use inline backticks per the Markdown rules for identifiers; when full snippets are requested, keep them minimal and purposeful.',
  references:
    'Always end with a ## References section — markdown links to every source cited. Do not scatter Sources: blocks mid-article.',
} as const;

export function formatArticleStyle(): string {
  return `- Title: ${articleStyle.title}
- Voice: ${articleStyle.voice}
- Article type: ${articleStyle.articleType}
- Grounding: ${articleStyle.grounding}
- Thin source: ${articleStyle.thinSource}
- Source attribution: ${articleStyle.sourceAttribution}
- Side question: ${articleStyle.sideQuestion}
- Notes integration: ${articleStyle.notesIntegration}
- Research brief: ${articleStyle.researchBrief}
- Personal content: ${articleStyle.personalContent}
- Opening: ${articleStyle.opening}
- Section headings: ${articleStyle.sectionHeadings}
- Structure: ${articleStyle.structure}
- Flow: ${articleStyle.flow}
- Length: ${articleStyle.length}
- Prose: ${articleStyle.prose}
- Markdown: ${articleStyle.markdown}
- Code: ${articleStyle.code}
- References: ${articleStyle.references}`;
}

export function formatEditorReviewRules(): string {
  return `- Reject invented content (see Grounding, Thin source).
- Reject arrogant/evaluative framing (see Title, Voice, Article type, Section headings).
- Reject bullet-heavy or rubric-shaped drafts (see Structure, Flow).
- Reject unattributed vendor claims (see Source attribution).
- Reject pasted note phrasing (see Notes integration).
- Flag excessive length (see Length).
- Flag fenced code when notes did not request it (see Code).
- Flag missing or excessive inline Markdown (see Markdown).`;
}

export const articleMarkdownSkeleton = `# Plain informative title naming the subject

[Opening: 1–2 paragraphs on what the source covers and why it is worth reading — grounded in the material, not a personal verdict]

## Section …

[Two or more prose paragraphs explaining the idea. Use **bold**, *italic*, and \`inline code\` where they aid scanning — see Markdown rules. No bullets unless author notes explicitly request a checklist.]

## References
- [Title](url)`;
