# Agentic writer

Agentic writer is a Mastra-powered content pipeline: write an article from notes, then generate social posts — with human approval on articles before promotion.

```mermaid
flowchart LR
    you([You]) --> notes[Notes] --> writer([Writer workflow]) --> article[Article] --> social([Social workflow]) --> posts[Posts on disk]

    style writer fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    style social fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d
```

## Getting Started

Set your OpenAI key in `.env`:

```shell
cp .env.example .env
# then edit .env and set OPENAI_API_KEY
```

> Models are tiered for cost vs quality in `src/mastra/config/models.ts`. Override any agent via env for A/B testing — see [docs/agents.md#ab-testing-model-overrides](docs/agents.md#ab-testing-model-overrides).

Customize the pipeline for yourself (gitignored, local only):

```shell
cp src/mastra/config/user-profile.local.example.ts src/mastra/config/user-profile.local.ts
# edit name, mission, audience, voice, and goals
```

Approved articles are saved under `data/articles/<article-id>/` (gitignored), with numbered drafts and editor reviews kept alongside `approved.md`. Social campaigns are written under each article's `social/` folder. The social media workflow shows approved articles in an **article** dropdown after you run the article workflow.

Start the development server:

```shell
npm run dev
```

Open [http://localhost:4111](http://localhost:4111) in Studio: run `articleWorkflow` with your notes, then `socialMediaWorkflow` — pick a saved article from the dropdown and choose target platforms.

You can start editing files inside the `src/mastra` directory. The development server will automatically reload whenever you make changes.

## Workflows

| Workflow | Description |
|----------|-------------|
| Article workflow | Turns raw author notes into a researched, written, and human-approved Markdown article. |
| Social media workflow | Turns the approved Markdown article into platform-native posts and a hero image, saved to disk under the article folder. |

See [docs/workflows.md](docs/workflows.md) for steps, inputs/outputs, and integration details.

## Agents

Six specialized agents power the two workflows. Each agent's tone and personality is centralized in `src/mastra/config/personalities.ts` so it can be tuned project-wide without touching the agent definitions.

| Agent | Model | Description |
|-------|-------|-------------|
| Researcher | `openai/gpt-5-mini` | Extracts topics from author notes, searches the web, and produces a research brief for the Writer. |
| Writer | `openai/gpt-5` | Drafts and revises the article as Markdown from the research brief, notes, and editorial feedback. |
| Editor | `openai/gpt-4.1-mini` | Reviews each draft against the notes and research brief, and recommends approval or another writing pass. |
| Strategist | `openai/gpt-5-nano` | Decides per-platform publication strategy — hook, call to action, and timing — for a social campaign. |
| Content Creator | `openai/gpt-5-mini` | Writes platform-native posts from the article and a creative brief for the hero image; optionally shortens a publish URL via Dub. |
| Graphic Designer | `openai/gpt-4.1-nano` | Executes the Content Creator's creative brief into one on-brand hero image. |

See [docs/agents.md](docs/agents.md) for models, tools, full instructions, and personality details.

See [docs/observability-memory-and-token-limiter.md](docs/observability-memory-and-token-limiter.md) for observability, observational memory, and input token limiting.

See [docs/customization.md](docs/customization.md) for local profile and article storage.

---

This tool is developed with [Mastra](https://mastra.ai/), an open-source TypeScript framework for building AI agents and workflows.
