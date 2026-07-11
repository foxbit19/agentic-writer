# MCP server

The Agentic Writer MCP server exposes the article and social pipelines to any MCP client (Cursor, Claude Desktop, etc.) while `npm run dev` is running.

## Connect

With the Mastra dev server up (`npm run dev`), the HTTP MCP endpoint is:

```
http://localhost:4111/api/mcp/agentic-writer/mcp
```

SSE transport (if your client prefers it):

```
http://localhost:4111/api/mcp/agentic-writer/sse
```

### Claude Desktop

Claude Desktop’s `claude_desktop_config.json` only launches stdio processes. Bridge to the local HTTP endpoint with `mcp-remote` (requires `npm run dev` in this repo):

```json
"agentic-writer": {
  "command": "npx",
  "args": [
    "-y",
    "mcp-remote",
    "http://localhost:4111/api/mcp/agentic-writer/mcp",
    "--transport",
    "http-only"
  ]
}
```

Restart Claude Desktop after editing the config.

Source: [`src/mastra/mcp/writer-mcp-server.ts`](../src/mastra/mcp/writer-mcp-server.ts). Tools live in [`src/mastra/tools/writer-mcp-tools.ts`](../src/mastra/tools/writer-mcp-tools.ts).

Approval uses the same LibSQL workflow storage as Studio, so start/resume only works against the running Mastra process that owns `mastra.db`.

## Tools

| Tool | Input | Notes |
|------|-------|--------|
| `start_article_workflow` | `{ notes, authorDraft? }` | `notes` = operating instructions; optional `authorDraft` = prose to develop. Blocks until first human-approval suspend (or completion). Can take several minutes. |
| `list_articles` | `{ status? }` | All workspaces; optional `in_progress` / `awaiting_review` / `approved` filter. |
| `get_article` | `{ articleId }` | Manifest + `approved.md` when present. |
| `get_article_drafts` | `{ articleId }` | Numbered drafts with editor reviews and human notes. |
| `get_article_status` | `{ articleId }` | `article.json` status plus workflow run status when available. |
| `approve_draft` | `{ articleId, notes? }` | Resume suspended run with `approved: true`. |
| `reject_draft` | `{ articleId, notes }` | Resume with `approved: false` and revision guidance; waits for next suspend. |
| `start_social_media_workflow` | `{ articleId, platforms, articleUrl? }` | Blocks until campaign is saved. |
| `list_social_campaigns` | `{ articleId }` | Campaign folders under the article. |
| `get_social_campaign` | `{ articleId, campaignId }` | Posts, strategy (timing), hero image URL/path. |

## Typical flow

1. `start_article_workflow` with notes (and optional authorDraft) → returns `suspended` + draft/editor review in `suspendPayload`.
2. Inspect with `get_article_drafts` / `get_article_status` if needed.
3. `approve_draft` or `reject_draft` (reject loops until approve).
4. `start_social_media_workflow` with platforms.
5. `get_social_campaign` for posts, strategy timing, and hero image.
