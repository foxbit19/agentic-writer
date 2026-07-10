import { MCPClient } from '@mastra/mcp';

let client: MCPClient | undefined;

/**
 * Lazily-created singleton. MCPClient throws if you construct more than one instance
 * with an identical config, so this must be created once and reused across workflow
 * runs rather than re-instantiated per request.
 */
export function getDubMcpClient(): MCPClient {
  if (!client) {
    client = new MCPClient({
      id: 'dub-mcp-client',
      servers: {
        dub: {
          url: new URL('https://mcp.dub.co/mcp'),
          requestInit: {
            headers: {
              Authorization: `Bearer ${process.env.DUB_API_KEY ?? ''}`,
            },
          },
        },
      },
    });
  }
  return client;
}
