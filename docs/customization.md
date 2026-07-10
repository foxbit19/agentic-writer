# Customization

Tune the pipeline to your voice and goals without committing personal config.

## Author profile (all agents)

| File | Committed | Purpose |
|------|-----------|---------|
| `src/mastra/config/user-profile.example.ts` | Yes | Default example profile |
| `src/mastra/config/user-profile.local.example.ts` | Yes | Blank template to copy |
| `src/mastra/config/user-profile.local.ts` | **No** (gitignored) | Your local profile |

Setup:

```shell
cp src/mastra/config/user-profile.local.example.ts src/mastra/config/user-profile.local.ts
```

Edit `user-profile.local.ts` — name, role, mission, target audience, brand voice, and goals. Every agent (Researcher, Writer, Editor, Strategist, Content Creator) reads this via `formatUserProfile()` at startup.

If `user-profile.local.ts` is missing, the example profile is used.

## Saved articles

Approved Markdown from the article workflow is written to `data/articles/` (gitignored). Each workflow run gets its own folder:

```
data/articles/
  gpt_5_6_sol_what_actually_matters_a0b2b143/
    article.json              # id, runId, status, currentDraft, title, timestamps
    notes.md                  # original input
    research-brief.md         # researcher output
    drafts/
      001.md
      001.editor-review.md
      002.md
      002.editor-review.md
      002.human-notes.md      # only when you reject a draft
    approved.md              # written on finalize
```

`article.json` tracks status: `in_progress`, `awaiting_review` (suspended — resume the run in Studio), or `approved`. The social media workflow lists only folders with `approved.md`.

## Social campaigns

Each social workflow run writes a campaign under the article folder:

```
data/articles/{article_id}/social/{campaign_id}/
  campaign.json       # runId, articleId, platforms, savedAt, imageUrl
  strategy.md         # strategist summary + per-platform angles
  image-brief.md      # content creator brief for the hero image
  hero-image.json     # { url, altText } — PNG stays in generated-images/
  posts/
    linkedin.md
    twitter.md
```

Review posts on disk and publish manually. Buffer integration is dormant for now.

## Brand visuals

Edit `src/mastra/config/visual-style.ts` to change colors and illustration rules for hero images. Hero images are always abstract and text-free by policy (enforced in the tool, agents, and visual style config).

## Generated images

AI hero images are stored under `src/mastra/public/generated-images/` (gitignored). Paths are resolved from the tool file location, not `process.cwd()`, so images are not written under nested `public/src/mastra/...` folders.
