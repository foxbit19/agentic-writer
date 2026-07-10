# Observability, memory and token limiter

Cross-cutting runtime behavior configured in `src/mastra/index.ts` and shared agent config under `src/mastra/config/`.

## Observability

Configured in `src/mastra/index.ts` with `@mastra/observability`.

### Storage

Composite storage routes domains separately:

| Domain | Backend | File |
|--------|---------|------|
| Default (agents, memory, workflows) | LibSQL | `mastra.db` |
| Observability | DuckDB | DuckDB store for the `observability` domain |

### Exporters

| Exporter | Behavior |
|----------|----------|
| `MastraStorageExporter` | Persists traces, logs, and metrics to the local DuckDB observability store. View in Studio at [http://localhost:4111](http://localhost:4111) (**Traces**, **Logs**, **Metrics**). |
| `MastraPlatformExporter` | Sends the same data to a hosted Mastra Platform project when `MASTRA_PLATFORM_ACCESS_TOKEN` and `MASTRA_PROJECT_ID` are set in `.env`. |

### Other settings

- **Service name:** `agentic-writer`
- **Logger:** `PinoLogger` at `info` level
- **Log forwarding:** enabled at `info` level into observability storage
- **Span processors:** `SensitiveDataFilter` redacts passwords, tokens, and keys before export

### Optional environment variables

```bash
MASTRA_PLATFORM_ACCESS_TOKEN=your-platform-access-token
MASTRA_PROJECT_ID=your-project-id
```

See `.env.example` for setup notes.

## Observational memory

Configured in `src/mastra/config/agent-memory.ts` and attached to every agent as `memory: agentMemory`.

| Setting | Value |
|---------|-------|
| Observer/reflector model | `openai/gpt-4.1-mini` |
| Memory storage | LibSQL (`mastra.db`) via Mastra instance storage |
| Thread scope | `{runId}:{agentId}` per workflow step (see `src/mastra/lib/workflow-memory.ts`) |
| Resource ID | `agentic-writer` (or workflow `resourceId` when provided) |

Workflow steps pass memory on each `agent.generate()` call so tool-heavy agents (Researcher, Content Creator, Graphic Designer) can compress growing conversation history within a run.

### Per-agent benefit

| Agent | Primary benefit |
|-------|-----------------|
| Researcher | Compresses web-search tool results across multiple searches. |
| Content Creator | Compresses Dub and Buffer MCP tool history across create and publish steps. |
| Graphic Designer | Compresses image-generation tool context. |
| Writer / Editor / Strategist | Lower impact on typical runs; revision loops benefit when history grows. |

## Input token limiter

Configured in `src/mastra/config/token-limiter.ts` and attached to every agent as `inputProcessors: [inputTokenLimiter]`.

| Setting | Value |
|---------|-------|
| Limit | 16,000 tokens per agent step |
| Trim mode | `contiguous` — keeps the most recent messages as a continuous suffix; system prompts are preserved |

Applied at every step of the agentic loop, including tool-call continuations. Acts as a hard ceiling on input context before observational memory thresholds are reached.
