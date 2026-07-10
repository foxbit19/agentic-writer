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

Approved MDX from the article workflow is written to `data/articles/` (gitignored):

```
data/articles/
  my-article-a1b2c3d4.mdx
  my-article-a1b2c3d4.json   # id, title, savedAt
```

The social media workflow lists these files in an **articleId** dropdown in Studio.

## Brand visuals

Edit `src/mastra/config/visual-style.ts` to change colors and illustration rules for hero images. Hero images are always abstract and text-free by policy (enforced in the tool, agents, and visual style config).

## Generated images

AI hero images are stored under `src/mastra/public/generated-images/` (gitignored). Paths are resolved from the tool file location, not `process.cwd()`, so images are not written under nested `public/src/mastra/...` folders.
