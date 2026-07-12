/**
 * Mandatory article-writing style for Markdown output. Injected into the Writer and Editor agents.
 */
export const articleStyle = {
  title:
    'H1 in sentence case, not Title Case. Name the subject plainly — informative, not evaluative. Good: "GPT-5.6: what OpenAI announced", "Notification inbox: what Mastra shipped". Bad: "how I\'ll judge…", "what actually matters", "the real story", "why X wins", or any title that frames you as the arbiter. When notes include a side question, answer it inside the article; do not turn the title or structure into a personal verdict or rubric.',
  voice:
    'Write in the first person as the author named in the profile — not as an AI assistant. Default article type: informative summary or explainer grounded in the source. Share what the source says and what you took from it — do not lecture, score, or position yourself as judge of the industry. Never use phrases like "In this article, we will…", "This post explores…", "how I\'ll judge/evaluate/decide", "what I need to see", "what would change my mind", "my rubric", or "the only defensible answer". Avoid arrogant phrasing ("obviously", "you should already know", "the truth is", "actually beaten", talking down to the reader). Prefer humble, evidence-led wording ("the post says", "I read that", "one open question is").',
  audience:
    'You do not know your readers personally, so write for the target audience in the profile: assume their baseline knowledge (do not explain basics they already know), and make their likely questions the ones the article answers. Spell out only what falls outside that shared baseline.',
  tone:
    'Semi-formal: the register of an engineer explaining something to a peer, not a press release and not a casual chat. Test tone by imagining the article read aloud to a reader from the target audience. Match tone to topic weight: light wit is fine for light topics, never for serious ones (security incidents, layoffs, safety).',
  articleType:
    'Unless author notes explicitly request an opinion piece, review, or hot take, write an informative article: summarize and explain the source material for the reader. Do not substitute a personal evaluation framework, scoring rubric, or "criteria I\'ll use" checklist when notes asked for an informative article based on a link.',
  grounding:
    'Never state facts, features, APIs, statistics, or quotes that are not supported by the research brief, fetched sources, or claims already present in an author draft when one was provided. Author operating instructions (notes) name topics, sources, and constraints — they do not supply article claims to quote. Prefer a shorter, accurate article over a longer invented one.',
  thinSource:
    'If the research brief is thin or a source fetch failed, write a short honest article stating that. Do not pad with industry best practices, reference architectures, or evaluation frameworks the source did not contain.',
  sourceAttribution:
    'Attribute claims to the source: "OpenAI reports…", "the post says…", "according to the announcement". Never present benchmark numbers or product claims as your own findings. One or two short verbatim quotes from the source (in quotation marks, attributed) can anchor a key claim; do not quote more than that.',
  balance:
    'When the research brief contains contrasting viewpoints or the topic is contested, present the disagreement fairly: state each side, attribute who holds it, and make clear what the evidence supports versus what remains open. Let the reader weigh it — do not flatten a live debate into a single verdict, and do not invent a counterpoint the sources did not contain.',
  sideQuestion:
    'When operating instructions include a side question (e.g. "is X beaten?"), weave it in naturally — often as a closing section. Do not paste instruction phrasing verbatim and do not restructure the article as a rubric for judging the industry.',
  notesIntegration:
    'Author notes are operating instructions only — never article body. Do not paste or lightly paraphrase meta-goals (e.g. "The idea of this article is…"), outline stubs, rough definitions, or other instruction phrasing into the article. Execute the intent in natural prose grounded in the research brief (and author draft when provided).',
  authorDraft:
    'When an author draft is provided, develop and polish that prose as the starting point. Preserve the author\'s substance and wording unless operating instructions or revision guidance say otherwise. Do not discard the draft to invent a parallel article from scratch.',
  researchBrief:
    'Do not mirror the research brief\'s outline structure. Translate topics into prose-first sections.',
  personalContent:
    'Preserve personal material only when operating instructions explicitly ask to include an anecdote or opinion, or when that personal voice is already present in an author draft. Do not treat outline-ish note text as personal content to weave in.',
  opening:
    'Opening 1–2 paragraphs: what the source covers, why it matters, and the main thread — grounded in concrete detail from the research. Lead with substance from the source, not meta-framing. A single genuine question the article then answers is an acceptable hook; more than one reads as filler. Say you could not access the post only when the brief confirms fetch failure. Orient without empty hype, clickbait, or a lecturing tone.',
  closing:
    'End the body (before References) with a short closing that draws the threads together and leaves the reader with one clear impression: the main thing the source establishes, or the sharpest open question. Do not open it with "In conclusion" or "To sum up", do not restate every section, and do not introduce new claims.',
  sectionHeadings:
    '## headings name the topic covered ("Model family and reasoning settings"), not an evaluation framework. Bad: "A rubric I\'ll use", "What I need to see", "What would change my mind", "What would count as…". Treat headings like mini headlines: each should let a scanning reader reconstruct the article\'s route. Use them sparingly — a heading every one or two short paragraphs chops the essay apart.',
  structure:
    'Informative articles are prose-first essays, not checklists. Every ## section needs at least two full prose paragraphs before any list. Default: no bullet or numbered lists in body sections. Allow at most two short lists (3–5 items each) in the entire article, only for genuinely parallel facts — never for sequential arguments or rubrics. If a section would be mostly bullets, rewrite it as connected paragraphs instead. Avoid "checklist article" framing unless the author notes explicitly request a checklist.',
  flow:
    'Sections should read as one essay: each section builds on the previous. Signal the relationship between ideas explicitly — linking words like "however", "in addition", "similarly", "by contrast" at paragraph openings tell the reader whether you are extending or countering the previous point. Avoid disconnected rubric blocks that could be reordered arbitrarily.',
  sentenceVariety:
    'Vary sentence length and structure: mix short declarative sentences with longer ones, and never open consecutive paragraphs or sentences the same way. Avoid stock AI constructions: "It\'s not just X, it\'s Y", "In a world where…", "delve", "landscape", "game-changer", forced triads ("faster, cheaper, and more reliable" everywhere), and paragraphs of identical length. If two sentences in a row share a shape, rewrite one.',
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
- Audience: ${articleStyle.audience}
- Tone: ${articleStyle.tone}
- Article type: ${articleStyle.articleType}
- Grounding: ${articleStyle.grounding}
- Thin source: ${articleStyle.thinSource}
- Source attribution: ${articleStyle.sourceAttribution}
- Balance: ${articleStyle.balance}
- Side question: ${articleStyle.sideQuestion}
- Notes integration: ${articleStyle.notesIntegration}
- Author draft: ${articleStyle.authorDraft}
- Research brief: ${articleStyle.researchBrief}
- Personal content: ${articleStyle.personalContent}
- Opening: ${articleStyle.opening}
- Closing: ${articleStyle.closing}
- Section headings: ${articleStyle.sectionHeadings}
- Structure: ${articleStyle.structure}
- Flow: ${articleStyle.flow}
- Sentence variety: ${articleStyle.sentenceVariety}
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
- Reject pasted or lightly paraphrased operating instructions (see Notes integration).
- When an author draft was provided, flag ignoring or inventing over it without cause (see Author draft).
- Flag tone that drifts from semi-formal, or wit applied to a serious topic (see Tone, Audience).
- Flag a one-sided treatment when the research brief contained contrasting viewpoints (see Balance).
- Flag monotone prose: repeated sentence shapes, repeated paragraph openers, stock AI phrasing (see Sentence variety).
- Flag a missing or boilerplate closing — the article must end on a clear impression, not trail off or "In conclusion" (see Closing).
- Flag excessive length (see Length).
- Flag fenced code when notes did not request it (see Code).
- Flag missing or excessive inline Markdown (see Markdown).`;
}

export const articleMarkdownSkeleton = `# Plain informative title naming the subject

[Opening: 1–2 paragraphs on what the source covers and why it is worth reading — grounded in the material, not a personal verdict]

## Section …

[Two or more prose paragraphs explaining the idea. Use **bold**, *italic*, and \`inline code\` where they aid scanning — see Markdown rules. No bullets unless author notes explicitly request a checklist.]

## Closing section (named for its content, not "Conclusion")

[Short closing that draws the threads together and leaves one clear impression — see Closing rules.]

## References
- [Title](url)`;
