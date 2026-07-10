
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { registerApiRoute } from '@mastra/core/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { articleWorkflow } from './workflows/article-workflow';
import { socialMediaWorkflow } from './workflows/social-media-workflow';
import { researcherAgent } from './agents/researcher-agent';
import { writerAgent } from './agents/writer-agent';
import { editorAgent } from './agents/editor-agent';
import { strategistAgent } from './agents/strategist-agent';
import { contentCreatorAgent } from './agents/content-creator-agent';
import { graphicDesignerAgent } from './agents/graphic-designer-agent';
import { GENERATED_IMAGES_DIR } from './tools/generate-image-tool';

export const mastra = new Mastra({
  workflows: { articleWorkflow, socialMediaWorkflow },
  agents: { researcherAgent, writerAgent, editorAgent, strategistAgent, contentCreatorAgent, graphicDesignerAgent },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'agentic-writer',
        exporters: [
          new MastraStorageExporter(), // Persists traces, logs, and metrics to local DuckDB (visible in Studio)
          new MastraPlatformExporter(), // Sends data to Mastra Platform when MASTRA_PLATFORM_ACCESS_TOKEN is set
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
        logging: {
          enabled: true,
          level: 'info',
        },
      },
    },
  }),
  server: {
    apiRoutes: [
      // Serves images the content-creator agent generates so they have a URL Buffer can
      // fetch. Filenames are always crypto.randomUUID() + '.png', so this pattern also
      // rules out path traversal.
      registerApiRoute('/generated-images/:filename', {
        method: 'GET',
        handler: async (c) => {
          const filename = c.req.param('filename');
          if (!/^[0-9a-f-]+\.png$/i.test(filename)) {
            return c.json({ error: 'Not found' }, 404);
          }

          try {
            const file = await readFile(path.join(GENERATED_IMAGES_DIR, filename));
            return new Response(new Uint8Array(file), { headers: { 'Content-Type': 'image/png' } });
          } catch {
            return c.json({ error: 'Not found' }, 404);
          }
        },
      }),
    ],
  },
});
