# AGENTS.md

## CRITICAL: Load `mastra` skill first

Load the `mastra` skill BEFORE any Mastra work. Never rely on cached knowledge — APIs change between versions.

## Documentation

Load the `update-docs` skill after code changes and update affected docs when necessary (see `.agents/skills/update-docs/SKILL.md`).

- `README.md` — project overview, workflows, setup
- `docs/agents.md` — detailed agent reference
- `docs/workflows.md` — detailed workflow reference
- `docs/observability-memory-and-token-limiter.md` — observability, observational memory, token limiter

## Rules

- Register all agents, tools, workflows, and scorers in `src/mastra/index.ts`
- Use the `dev` and `build` scripts from `package.json` instead of running `mastra dev` / `mastra build` directly

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Skills Discovery](https://mastra.ai/.well-known/skills/index.json)
