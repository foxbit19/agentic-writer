# Customization

Tune the pipeline to your voice and goals without committing personal config.

## Author profile (all agents)

| File | Committed | Purpose |
|------|-----------|---------|
| `src/mastra/config/user-profile.example.json` | Yes | Default example profile (fallback) |
| `src/mastra/config/user-profile.local.example.json` | Yes | Blank template to copy |
| `src/mastra/config/user-profile.local.json` | **No** (gitignored) | Your local profile |

Setup:

```shell
cp src/mastra/config/user-profile.local.example.json src/mastra/config/user-profile.local.json
```

Edit `user-profile.local.json` — name, role, mission, target audience, brand voice, and goals. Every agent (Researcher, Writer, Editor, Strategist, Content Creator) reads this via `formatUserProfile()` at startup.

The loader resolves paths from the project root, including when Mastra runs from `.mastra/output/`. If `user-profile.local.json` is missing, the example profile (`Marty McFly`) is used.

## Saved articles

Approved Markdown from the article workflow is written to `data/articles/` (gitignored). Each workflow run gets its own folder:

```
data/articles/
  gpt_5_6_sol_what_actually_matters_a0b2b143/
    article.json              # id, runId, status, currentDraft, title, timestamps
    notes.md                  # operating instructions (not article body)
    author-draft.md           # optional; author prose/outline to develop
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
  hero-image.json     # { filename, url, altText }
  hero-image.png      # saved alongside the campaign
  posts/
    linkedin.md
    twitter.md
```

Review posts on disk and publish manually.

## Brand visuals

Edit `src/mastra/config/visual-style.ts` to change colors and illustration rules for hero images. Hero images are always abstract and text-free by policy (enforced in the tool, agents, and visual style config).

## Hero images

AI hero images are saved as `hero-image.png` inside each campaign folder under `data/articles/{article_id}/social/{campaign_id}/`. The dev server serves them at `/articles/{articleId}/social/{campaignId}/hero-image.png` when `PUBLIC_BASE_URL` is set (defaults to `http://localhost:4111`).
