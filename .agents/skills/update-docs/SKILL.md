---
name: update-docs
description: >-
  Keeps project documentation in sync with code changes. Use after editing
  agents, workflows, tools, config, env vars, observability, memory, or token
  limits — or when the user asks to update docs.
---

# Update project documentation

After completing a code change, check whether user-facing documentation needs updating. Skip doc edits when the change is internal, cosmetic, or clearly invisible to users.

## Documentation map

| File | Update when |
|------|-------------|
| `README.md` | Getting started, env requirements, high-level agent/workflow summary tables |
| `docs/agents.md` | Agent instructions, models, tools, personalities, memory/token-limit behavior per agent |
| `docs/workflows.md` | Workflow steps, inputs/outputs, integration notes, env requirements per workflow |
| `docs/mcp.md` | MCP server endpoint, tools, client connection notes |
| `docs/customization.md` | Local author profile, saved articles, brand visuals |
| `docs/observability-memory-and-token-limiter.md` | Observability exporters/storage, observational memory, input token limiter |
| `.env.example` | New, renamed, or removed environment variables |
| `AGENTS.md` | New project-wide rules for coding agents (only when conventions change) |

`README.md` stays concise. Keep detailed prose in `docs/agents.md`, `docs/workflows.md`, and `docs/observability-memory-and-token-limiter.md`.

## Workflow

1. Finish the code change first.
2. Decide if docs are affected using the table above.
3. If yes, update every affected file in the same pass — do not leave README and `docs/` out of sync.
4. Keep the README summary tables aligned with `docs/agents.md` and `docs/workflows.md`; link to `docs/observability-memory-and-token-limiter.md` for runtime config details.
5. Do not edit docs the user did not ask for unless the code change makes them wrong or incomplete.

## Agent changes checklist

When `src/mastra/agents/**` or `src/mastra/config/personalities.ts` changes:

- [ ] `docs/agents.md` — model, tools, instructions, personality quotes
- [ ] `README.md` — summary table row if the agent's role changed

When `src/mastra/config/agent-memory.ts` or `src/mastra/config/token-limiter.ts` changes:

- [ ] `docs/observability-memory-and-token-limiter.md` — memory and token limiter sections
- [ ] `docs/agents.md` — shared config note at the top if behavior changed

When workflows change (`src/mastra/workflows/**`):

- [ ] `docs/workflows.md` — steps, inputs/outputs, integrations, env notes
- [ ] `README.md` — workflow summary table if the workflow's role changed

When observability changes (`src/mastra/index.ts` exporters/storage):

- [ ] `docs/observability-memory-and-token-limiter.md` — observability section
- [ ] `.env.example` — platform observability vars

## Style

- Match existing README tone: clear prose, tables where they aid scanning.
- Use markdown links to `docs/` files from README instead of duplicating long sections.
- Do not add docs for changes the user explicitly said not to document.
