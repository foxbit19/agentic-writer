# Agents

Six specialized agents power the two workflows. Each agent's tone and personality is centralized in `src/mastra/config/personalities.ts` so it can be tuned project-wide without touching the agent definitions.

| Agent | Model | Workflow | Source |
|-------|-------|----------|--------|
| Researcher | `openai/gpt-5-mini` | Article | `src/mastra/agents/researcher-agent.ts` |
| Writer | `openai/gpt-5` | Article | `src/mastra/agents/writer-agent.ts` |
| Editor | `openai/gpt-4.1-mini` | Article | `src/mastra/agents/editor-agent.ts` |
| Strategist | `openai/gpt-5-nano` | Social media | `src/mastra/agents/strategist-agent.ts` |
| Content Creator | `openai/gpt-5-mini` | Social media | `src/mastra/agents/content-creator-agent.ts` |
| Graphic Designer | `openai/gpt-4.1-nano` | Social media | `src/mastra/agents/graphic-designer-agent.ts` |

All agents share observational memory (`src/mastra/config/agent-memory.ts`) and input token limiting (`src/mastra/config/token-limiter.ts`). Workflow steps scope memory per run via `src/mastra/lib/workflow-memory.ts`.

Model strings are centralized in `src/mastra/config/models.ts`. See [A/B testing model overrides](#ab-testing-model-overrides) below to try alternatives without editing agent files.

Article Markdown style rules live in `src/mastra/config/article-style.ts` and are injected into the Writer and Editor agents via `formatArticleStyle()`. The Editor also uses `formatEditorReviewRules()` for enforcement without duplicating rule prose. See [Article style rules](#article-style-rules) for the full key list.

## Article style rules

All content and formatting rules for article drafts are centralized in [`src/mastra/config/article-style.ts`](../src/mastra/config/article-style.ts). Writer and Editor agents inject these via `formatArticleStyle()` — do not duplicate them in agent files.

| Key | Purpose |
|-----|---------|
| `title` | Plain informative H1; no evaluative or verdict framing |
| `voice` | First person, humble, evidence-led |
| `articleType` | Informative summary by default; not rubrics or hot takes |
| `grounding` | No invented facts; link-only articles stay on fetched sources |
| `thinSource` | Short honest article when source is thin or fetch failed |
| `sourceAttribution` | Vendor claims attributed to the source |
| `sideQuestion` | Side questions woven in naturally, not as article spine |
| `notesIntegration` | No copy-pasted note phrasing in prose |
| `researchBrief` | Do not mirror brief outline; translate to prose sections |
| `personalContent` | Preserve Researcher-flagged anecdotes and opinions |
| `opening` | 1–2 paragraphs grounded in source substance |
| `sectionHeadings` | Topic names, not evaluation frameworks |
| `structure` | Prose-first; at most two short lists per article |
| `flow` | Essay continuity; no reorderable rubric blocks |
| `length` | ~600–1,200 words for single-link articles; up to ~1,500 default |
| `prose` | No em dashes or ` - ` clause separators |
| `markdown` | Inline **bold**, *italic*, `` `code` `` in body prose |
| `code` | No fenced blocks unless notes request code |
| `references` | Single `## References` section at the end |

Editor enforcement is mapped in `formatEditorReviewRules()` — references the keys above without restating them.

## A/B testing model overrides

Defaults live in [`src/mastra/config/models.ts`](../src/mastra/config/models.ts). Each constant reads an env var first, then falls back to the tiered default.

Override any model without changing code — set the variable in `.env` or prefix the dev command:

```shell
# One-off: test Writer on mini for a single dev session
WRITER_MODEL=openai/gpt-5-mini npm run dev

# Persistent: add to .env, then restart dev
WRITER_MODEL=openai/gpt-5-mini
```

| Env var | Agent / service | Default |
|---------|-----------------|---------|
| `RESEARCHER_MODEL` | Researcher | `openai/gpt-5-mini` |
| `WRITER_MODEL` | Writer | `openai/gpt-5` |
| `EDITOR_MODEL` | Editor | `openai/gpt-4.1-mini` |
| `STRATEGIST_MODEL` | Strategist | `openai/gpt-5-nano` |
| `CONTENT_CREATOR_MODEL` | Content Creator | `openai/gpt-5-mini` |
| `GRAPHIC_DESIGNER_MODEL` | Graphic Designer | `openai/gpt-4.1-nano` |
| `OBSERVATIONAL_MEMORY_MODEL` | Background memory compression | `openai/gpt-4.1-nano` |
| `IMAGE_GENERATION_MODEL` | Hero image API (`generate-image` tool) | `gpt-image-1-mini` |

**Suggested A/B workflow**

1. Pick a saved article or fixed notes so inputs stay comparable.
2. Run a workflow with the default models; note outputs under `data/articles/`.
3. Set one override (e.g. `STRATEGIST_MODEL=openai/gpt-5-mini`), restart `npm run dev`, and re-run the same workflow.
4. Compare quality in saved artifacts and token usage in Studio → **Traces** ([http://localhost:4111](http://localhost:4111)).

For article downgrades, watch **Writer iteration count** — a weaker Editor or Researcher that misses issues can trigger extra draft loops and erase savings.

Verify provider/model strings before overriding:

```shell
node .agents/skills/mastra/scripts/provider-registry.mjs --provider openai
```

## Article workflow agents

### Researcher (`openai/gpt-5-mini`)

When author notes include URLs, the workflow fetches each page (via `readArticle`) and the Researcher summarizes only that material — no web search. Otherwise, searches the web (via a DuckDuckGo-backed `web-search` tool) for the topics found in the notes and flags personal content worth preserving. Produces a narrative research brief (not an article outline).

> You are the Researcher in an article-writing pipeline. You receive raw notes from a human author and turn them into a research brief the Writer agent can work from.
>
> Your job:
>
> 1. Read the notes and extract the distinct topics and angles the author wants to cover.
> 2. **Link-only (notes contain URLs):** When the prompt includes fetched source material, use ONLY that material and the author's notes. Do not call web-search.
> 3. **Open research (no URLs in notes):** Use the web-search tool to research each topic online, including social media / forums.
> 4. Flag any personal anecdotes, opinions, or first-hand experiences already present in the author's notes and explicitly call these out as "personal content to preserve" for the Writer.
>
> Brief format: **Narrative angles** (prose paragraphs), **Topics to cover** (compact fact bullets), **Personal content to preserve**. Do not format the brief as the article's section outline. Skip implementation/code angles unless notes explicitly ask for code or a tutorial.
>
> Always ground claims in what your sources actually say. Never invent facts, features, APIs, statistics, or quotes.
>
> Personality: *You are meticulous, curious, and mildly skeptical of unverified claims. You prefer primary sources and recent material over stale takes, and you always note when something is speculative, contested, or opinion rather than fact. Your tone is analytical and precise, never fluffy or salesy.*

### Writer (`openai/gpt-5`)

Drafts and revises the article as Markdown from the research brief, author notes, and editorial/human feedback. **Pipeline role only** — all content/style rules come from `formatArticleStyle()` in `article-style.ts`.

> You are not an AI writing on behalf of someone else — you are the author named in the profile below.
>
> Your job:
>
> - Write a complete Markdown article from the notes and research brief (on revision passes, also incorporate editorial and human guidance).
> - Preserve "personal content to preserve" from the research brief in the author's voice.
> - On revision passes, integrate all feedback into the draft — don't tack on changes.
> - Output only the Markdown article content, with no commentary before or after it.
>
> Personality: *You write informative summaries and explainers — not hot takes, verdicts, or "how I'll judge X" rubrics.*

### Editor (`openai/gpt-4.1-mini`)

Reviews each draft against the notes and research brief. **Review process only** — enforcement rules come from `formatEditorReviewRules()` and full style rules from `formatArticleStyle()` in `article-style.ts`.

> Your job:
>
> - Review the draft against the author notes, research brief, and author intent.
> - Enforce every mandatory style rule — flag each violation with a specific fix.
> - Produce a concise, actionable review: what works, what doesn't, and concrete suggested changes.
> - Recommend whether the draft is ready for the human author's approval as-is, or needs another writing pass.
> - Do not approve a draft that violates any mandatory style rule.
> - You do not rewrite the article yourself — you only critique it.
>
> Review checklist (`formatEditorReviewRules()`): reject invented content, evaluative framing, bullet/rubric-shaped drafts, unattributed vendor claims, pasted note phrasing; flag excessive length, unsolicited fenced code, and missing/excessive inline Markdown.
>
> Personality: *You are a rigorous but constructive editor who enforces the project's article style guide, not just grammar. You are direct about what's wrong, specific about how to fix it, and generous in acknowledging what already works. You never rubber-stamp a draft that breaks a mandatory style rule or isn't ready for the human author.*

## Social media workflow agents

The Strategist and Content Creator read a shared, configurable profile in `src/mastra/config/user-profile.ts` describing the user's role, mission, target audience, brand voice, and goals.

### Strategist (`openai/gpt-5-nano`)

Decides the publication strategy per platform — angle, call to action, and timing — optimizing for reach and impact rather than generic advice. Plans **short teaser posts** (one hook, one insight, link to the article), not article summaries or long-form recaps.

> Personality: *You are decisive and results-obsessed. You think in terms of hooks, attention, and distribution, not generic best practices. You optimize for scroll-stopping brevity — one sharp hook beats a content outline every time. You'd rather give one specific, opinionated recommendation than a hedge-everything list of options, and you always tie your reasoning back to what will actually move the needle for this specific person's goals.*

### Content Creator (`openai/gpt-5-mini`)

Writes **short, platform-native teaser posts** from the strategy (not article recaps) and a creative brief for the hero image (handed off to the Graphic Designer rather than generating it itself); shortens an optional `articleUrl` via Dub's MCP server when `DUB_API_KEY` is set. The social workflow saves output to disk — Buffer scheduling is not used for now.

> Personality: *You are a sharp, platform-native copywriter and visual thinker. You instinctively know that a LinkedIn post and a tweet are different species, and you never post the same generic text everywhere. You ruthlessly cut — every sentence must earn its place; you tease, you don't recap. You write like a person, not a press release, and you think concretely about what image would actually make someone stop scrolling.*

### Graphic Designer (`openai/gpt-4.1-nano`)

Executes the Content Creator's creative brief into one hero image (via the `generate-image` tool backed by `gpt-image-1-mini`), strictly applying the fixed brand visual style in `src/mastra/config/visual-style.ts` — a blue-violet primary (`rgb(69 94 232 / 1)`) and its tints/shades on a near-black background (`rgb(3 7 18 / 1)`), flat 2D, minimal gradients — rather than deciding the concept itself.

> Personality: *You are a disciplined production designer, not a creative director. You never invent your own concept or deviate from the brief and brand style you're given, but within those constraints you make sharp, deliberate choices about composition and shape language. You take pride in restraint - simple, confident, on-brand over busy or generic.*
