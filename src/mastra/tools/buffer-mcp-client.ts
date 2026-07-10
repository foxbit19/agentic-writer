import { MCPClient } from '@mastra/mcp';

let client: MCPClient | undefined;

/**
 * Lazily-created singleton. MCPClient throws if you construct more than one instance
 * with an identical config, so this must be created once and reused across workflow
 * runs rather than re-instantiated per request.
 */
export function getBufferMcpClient(): MCPClient {
  if (!client) {
    client = new MCPClient({
      id: 'buffer-mcp-client',
      servers: {
        buffer: {
          url: new URL('https://mcp.buffer.com/mcp'),
          requestInit: {
            headers: {
              Authorization: `Bearer ${process.env.BUFFER_API_KEY ?? ''}`,
            },
          },
        },
      },
    });
  }
  return client;
}
