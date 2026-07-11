import { MCPServer } from '@mastra/mcp';
import { writerMcpTools } from '../tools/writer-mcp-tools';

export const writerMcpServer = new MCPServer({
  id: 'agentic-writer',
  name: 'Agentic Writer',
  version: '1.0.0',
  description:
    'Control the agentic writer pipeline: start article and social workflows, review drafts, approve or reject, and read campaigns (posts, strategy, hero image).',
  instructions: `Use these tools to run the content pipeline end-to-end:

1. start_article_workflow with author notes — waits until a draft is ready for human review (can take several minutes).
2. get_article_drafts / get_article_status to inspect progress.
3. approve_draft or reject_draft (with notes) to continue the article loop.
4. After approval, start_social_media_workflow with an articleId and platforms.
5. list_social_campaigns / get_social_campaign for posts, publication strategy (timing), and hero image URL/path.`,
  tools: writerMcpTools,
});
