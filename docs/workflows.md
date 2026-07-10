# Workflows

Two Mastra workflows orchestrate the agents. Run the article workflow first, then feed its MDX output into the social media workflow. Source files live in `src/mastra/workflows/`.

| Workflow | ID | Source |
|----------|-----|--------|
| Article workflow | `article-workflow` | `src/mastra/workflows/article-workflow.ts` |
| Social media workflow | `social-media-workflow` | `src/mastra/workflows/social-media-workflow.ts` |

## Article workflow

The `articleWorkflow` turns raw author notes into a human-approved MDX article.

```mermaid
flowchart TD
    input["Input: notes"] --> research["Research topics (Researcher)"]
    research --> draftLoop

    subgraph draftLoop ["Draft review loop (until approved)"]
        write["Write draft (Writer)"]
        review["Review draft (Editor)"]
        approve["Human approval (suspend)"]
        write --> review --> approve
        approve -->|"rejected + notes"| write
    end

    finalize --> output["Save to data/articles/"]
    output --> result["Output: mdx, articleId, title"]
```

### Steps

1. **Research** — the Researcher extracts topics from the notes and researches them online (including social media/forums).
2. **Write** — the Writer drafts the article as MDX from the research brief.
3. **Review** — the Editor reviews the draft against the notes and research.
4. **Approve** — the workflow suspends for human approval; the human approves or rejects with additional notes.
5. Steps 2–4 repeat, feeding the editor's review and the human's notes back to the Writer, until the human approves.
6. The approved draft is saved to `data/articles/` and returned with its id.

### Input and output

**Input:** `{ notes: string }`

**Output:** `{ mdx: string, articleId: string, title: string }`

### Agents

Researcher → Writer → Editor (looping until human approval).

## Social media workflow

The `socialMediaWorkflow` loads a saved article from `data/articles/` and turns it into a human-approved social media campaign.

```mermaid
flowchart TD
    input["Input: articleId + platforms"] --> prepare["Load saved article"]
    prepare --> strategy["Plan strategy (Strategist)"]
    strategy --> create["Create posts + image brief (Content Creator)"]
    create --> design["Design hero image (Graphic Designer)"]
    design --> preview["Preview and approve (suspend)"]
    preview -->|declined| declined["Output: published false"]
    preview -->|approved| bufferKey{BUFFER_API_KEY set?}
    bufferKey -->|no| noKey["Output: published false"]
    bufferKey -->|yes| publish["Schedule via Buffer MCP (Content Creator)"]
    publish --> published["Output: published true + results"]
```

### Steps

1. **Load** — reads the selected article from `data/articles/` (dropdown in Studio).
2. **Strategize** — the Strategist decides a publication strategy: a hook/angle, call to action, and timing guidance for each requested platform.
3. **Create** — the Content Creator writes a platform-native post for every requested platform and an abstract, evocative creative brief for the hero image (no charts or text).
4. **Design** — the Graphic Designer executes that brief into one on-brand abstract hero image.
5. **Preview & approve** — the workflow suspends and shows the human the drafted posts and image; the human approves, optionally limiting to a subset of platforms, or declines and the workflow ends without publishing.
6. **Publish** — on approval, the Content Creator connects to Buffer via MCP, matches each platform to a connected Buffer channel, and adds the post to that channel's queue (skipping platforms with no connected channel).

### Input and output

**Input:** `{ articleId: string, platforms: string[], articleUrl?: string }` (see `SUPPORTED_PLATFORMS` in `src/mastra/config/platforms.ts`)

- `articleId` — saved article from `data/articles/` (Studio dropdown; run the article workflow first)
- `platforms` — target social platforms
- `articleUrl` (optional) — published URL for post CTAs and Dub link shortening

**Output:** `{ published: boolean, reason?: string, results?: Array<{ platform, status, detail? }> }`

### Environment and integrations

- **`BUFFER_API_KEY`** (see `.env.example`) — required to schedule posts. Without it, the workflow still runs through strategy, content creation, and preview, then ends with `published: false` at the approval step.
- **`PUBLIC_BASE_URL`** — must be a publicly reachable URL for Buffer to fetch AI-generated images when publishing for real. Defaults to `http://localhost:4111`, which is fine for previewing drafts without publishing images.
- **`DUB_API_KEY`** (optional) — when `articleUrl` is provided, the Content Creator shortens it via [Dub's MCP server](https://dub.co) before writing posts.

### Who this content is for

All agents read your profile from `src/mastra/config/user-profile.local.ts` when present (see [customization.md](customization.md)).

### Agents

Strategist → Content Creator → Graphic Designer → human approval → Content Creator (Buffer publish).
