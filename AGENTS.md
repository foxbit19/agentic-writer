# AGENTS.md

## CRITICAL: Load `mastra` skill first

Load the `mastra` skill BEFORE any Mastra work. Never rely on cached knowledge — APIs change between versions.

## Documentation

Load the `update-docs` skill after code changes and update affected docs when necessary (see `.agents/skills/update-docs/SKILL.md`).

- `README.md` — project overview, workflows, setup
- `docs/agents.md` — detailed agent reference
- `docs/workflows.md` — detailed workflow reference
- `docs/mcp.md` — MCP server endpoint and tools
- `docs/customization.md` — local profile and article storage
- `docs/observability-memory-and-token-limiter.md` — observability, observational memory, token limiter

## Rules

- Always remove dead code (see `.agents/skills/remove-dead-code/SKILL.md`)
- Always write a JSDoc comment for a function (see `.agents/skills/jsdoc-functions/SKILL.md`)
- Register all agents, tools, workflows, scorers, and MCP servers in `src/mastra/index.ts`
- Use the `dev` and `build` scripts from `package.json` instead of running `mastra dev` / `mastra build` directly

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Skills Discovery](https://mastra.ai/.well-known/skills/index.json)
