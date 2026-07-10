import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const GENERATED_IMAGES_DIR = path.join(process.cwd(), 'src/mastra/public/generated-images');

// Buffer (and any other publisher) fetches this URL server-side, so it must be reachable
// from the public internet, not just localhost. Set PUBLIC_BASE_URL to a tunneled or
// deployed URL for image attachments to work when actually publishing; localhost is fine
// for previewing drafts.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:4111';

const SIZE_OPTIONS = ['1024x1024', '1536x1024', '1024x1536'] as const;

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
  }),
  outputSchema: z.object({
    url: z.string().describe('Publicly reachable URL to the generated image'),
    width: z.number(),
    height: z.number(),
  }),
  execute: async ({ prompt, size }) => {
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
        model: 'gpt-image-1',
        prompt,
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

    await mkdir(GENERATED_IMAGES_DIR, { recursive: true });
    const filename = `${randomUUID()}.png`;
    await writeFile(path.join(GENERATED_IMAGES_DIR, filename), Buffer.from(b64, 'base64'));

    const [width, height] = size.split('x').map(Number);
    return {
      url: `${PUBLIC_BASE_URL}/generated-images/${filename}`,
      width,
      height,
    };
  },
});
