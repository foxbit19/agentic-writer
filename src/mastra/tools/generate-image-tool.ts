import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertSafeArticleId, assertSafeCampaignId } from '../lib/ids';
import { HERO_IMAGE_FILENAME } from '../lib/social-campaigns';
import { ARTICLES_DIR, GENERATED_IMAGES_DIR } from '../lib/paths';
import { IMAGE_GENERATION_MODEL } from '../config/models';

const IMAGE_PROMPT_SUFFIX =
  ' Evocative abstract illustration only. No text, letters, words, numbers, typography, logos, watermarks, charts, graphs, diagrams, screenshots, or UI mockups.';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:4111';

const SIZE_OPTIONS = ['1024x1024', '1536x1024', '1024x1536'] as const;

/**
 * Ensures `outputDir` resolves under `ARTICLES_DIR` so agents cannot write outside article storage.
 *
 * @param outputDir - Candidate directory from the Graphic Designer tool call
 * @returns Absolute resolved path under articles storage
 * @throws {Error} When the path escapes `ARTICLES_DIR`
 */
function assertSafeOutputDir(outputDir: string): string {
  const resolved = path.resolve(outputDir);
  const articlesRoot = path.resolve(ARTICLES_DIR);
  const relative = path.relative(articlesRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`outputDir must be under ${ARTICLES_DIR}`);
  }
  return resolved;
}

export const generateImageTool = createTool({
  id: 'generate-image',
  description:
    'Generate a visual (e.g. a social-media hero image) from a text prompt using an AI image model. Returns a publicly reachable URL to the generated image.',
  inputSchema: z.object({
    prompt: z.string().describe('Detailed, concrete description of the image to generate: subject, style, composition'),
    size: z
      .enum(SIZE_OPTIONS)
      .default('1536x1024')
      .describe('Image dimensions - landscape (1536x1024) suits most feeds, square (1024x1024) suits Instagram'),
    outputDir: z
      .string()
      .optional()
      .describe('Campaign directory to save hero-image.png inside the article folder'),
    articleId: z.string().optional().describe('Article id — required with outputDir for the image URL'),
    campaignId: z.string().optional().describe('Campaign id — required with outputDir for the image URL'),
  }),
  outputSchema: z.object({
    url: z.string().describe('Publicly reachable URL to the generated image'),
    width: z.number(),
    height: z.number(),
  }),
  execute: async ({ prompt, size, outputDir, articleId, campaignId }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set; cannot generate images.');
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: IMAGE_GENERATION_MODEL,
        prompt: `${prompt}${IMAGE_PROMPT_SUFFIX}`,
        size,
        n: 1,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Image generation failed with status ${response.status}: ${body}`);
    }

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('Image generation response did not include image data');
    }

    const [width, height] = size.split('x').map(Number);
    const imageBuffer = Buffer.from(b64, 'base64');

    if (outputDir && articleId && campaignId) {
      assertSafeArticleId(articleId);
      assertSafeCampaignId(campaignId);
      const safeDir = assertSafeOutputDir(outputDir);
      await mkdir(safeDir, { recursive: true });
      await writeFile(path.join(safeDir, HERO_IMAGE_FILENAME), imageBuffer);
      return {
        url: `${PUBLIC_BASE_URL}/articles/${articleId}/social/${campaignId}/${HERO_IMAGE_FILENAME}`,
        width,
        height,
      };
    }

    // Legacy fallback: global generated-images dir (deprecated)
    await mkdir(GENERATED_IMAGES_DIR, { recursive: true });
    const legacyFilename = `${randomUUID()}.png`;
    await writeFile(path.join(GENERATED_IMAGES_DIR, legacyFilename), imageBuffer);

    return {
      url: `${PUBLIC_BASE_URL}/generated-images/${legacyFilename}`,
      width,
      height,
    };
  },
});
