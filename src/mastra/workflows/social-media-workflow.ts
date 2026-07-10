import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { getBufferMcpClient } from '../tools/buffer-mcp-client';
import { getDubMcpClient } from '../tools/dub-mcp-client';
import { platformSchema } from '../config/platforms';
import { workflowAgentMemory } from '../lib/workflow-memory';
import { listSavedArticleIds, readSavedArticle } from '../lib/articles';
import { parseMdxArticle } from '../lib/mdx';

function buildArticleIdSchema() {
  const ids = listSavedArticleIds();
  if (ids.length === 0) {
    return z
      .string()
      .min(1)
      .describe('No saved articles yet. Run the article workflow first, then restart dev if needed.');
  }
  return z.enum(ids as [string, ...string[]]).describe('Saved article to promote');
}

const socialMediaWorkflowInputSchema = z.object({
  articleId: buildArticleIdSchema(),
  platforms: z.array(platformSchema).min(1).describe('Social media platforms to prepare posts for'),
  articleUrl: z
    .string()
    .url()
    .optional()
    .describe('Optional published URL for post CTAs and Dub link shortening'),
});

const postSchema = z.object({
  platform: platformSchema,
  text: z.string(),
  hashtags: z.array(z.string()).optional(),
});

const publishResultSchema = z.object({
  platform: platformSchema,
  status: z.enum(['scheduled', 'failed', 'skipped_no_channel']),
  detail: z.string().optional(),
});

const prepareArticleStep = createStep({
  id: 'prepare-article',
  description: 'Loads a saved MDX article from data/articles/',
  inputSchema: socialMediaWorkflowInputSchema,
  outputSchema: z.object({
    articleUrl: z.string().optional(),
    platforms: z.array(platformSchema),
    articleTitle: z.string(),
    articleText: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { articleId, platforms, articleUrl } = inputData;
    const saved = await readSavedArticle(articleId);
    const { title, textContent } = parseMdxArticle(saved.mdx);

    return {
      articleUrl,
      platforms,
      articleTitle: title || saved.title,
      articleText: textContent,
    };
  },
});

const strategyStep = createStep({
  id: 'plan-strategy',
  description: 'The Strategist decides the publication strategy for each platform',
  inputSchema: prepareArticleStep.outputSchema,
  outputSchema: z.object({
    articleUrl: z.string().optional(),
    articleTitle: z.string(),
    articleText: z.string(),
    platforms: z.array(platformSchema),
    strategySummary: z.string(),
    platformStrategies: z.array(
      z.object({
        platform: platformSchema,
        angle: z.string(),
        callToAction: z.string(),
        timingGuidance: z.string(),
      }),
    ),
  }),
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { articleUrl, articleTitle, articleText, platforms } = inputData;

    const strategist = mastra?.getAgent('strategistAgent');
    if (!strategist) {
      throw new Error('Strategist agent not found');
    }

    const urlLine = articleUrl ? `Article URL: ${articleUrl}\n` : '';

    const response = await strategist.generate(
      `Article title: ${articleTitle}\n${urlLine}\nArticle content:\n${articleText}\n\nTarget platforms: ${platforms.join(', ')}\n\nDecide the publication strategy for this article.`,
      {
        memory: workflowAgentMemory(runId, 'strategist-agent', resourceId),
        structuredOutput: {
          schema: z.object({
            strategySummary: z
              .string()
              .describe('2-3 sentence overview of the overall strategy and why it maximizes impact'),
            platformStrategies: z.array(
              z.object({
                platform: platformSchema,
                angle: z.string(),
                callToAction: z.string(),
                timingGuidance: z.string(),
              }),
            ),
          }),
        },
      },
    );

    return {
      articleUrl,
      articleTitle,
      articleText,
      platforms,
      strategySummary: response.object.strategySummary,
      platformStrategies: response.object.platformStrategies,
    };
  },
});

const createContentStep = createStep({
  id: 'create-content',
  description: 'The Content Creator writes platform-native posts and a creative brief for the hero image',
  inputSchema: strategyStep.outputSchema,
  outputSchema: z.object({
    strategySummary: z.string(),
    imageBrief: z.string(),
    posts: z.array(postSchema),
  }),
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { articleTitle, articleUrl, articleText, platformStrategies, strategySummary } = inputData;

    const contentCreator = mastra?.getAgent('contentCreatorAgent');
    if (!contentCreator) {
      throw new Error('Content Creator agent not found');
    }

    const toolsets = process.env.DUB_API_KEY && articleUrl ? await getDubMcpClient().listToolsets() : undefined;
    const urlLine = articleUrl ? `Article URL: ${articleUrl}\n` : '';

    const response = await contentCreator.generate(
      `Article title: ${articleTitle}\n${urlLine}\nArticle content:\n${articleText}\n\nPublication strategy: ${strategySummary}\n\nPer-platform strategy:\n${JSON.stringify(platformStrategies, null, 2)}\n\nWrite the posts and the hero image creative brief now.`,
      {
        memory: workflowAgentMemory(runId, 'content-creator-agent', resourceId),
        toolsets,
        structuredOutput: {
          schema: z.object({
            imageBrief: z
              .string()
              .describe('Creative brief for the Graphic Designer: concrete subject, mood, and composition to depict'),
            posts: z.array(postSchema),
          }),
        },
      },
    );

    return {
      strategySummary,
      imageBrief: response.object.imageBrief,
      posts: response.object.posts,
    };
  },
});

const designImageStep = createStep({
  id: 'design-image',
  description: 'The Graphic Designer executes the creative brief into one on-brand hero image',
  inputSchema: createContentStep.outputSchema,
  outputSchema: z.object({
    strategySummary: z.string(),
    imageUrl: z.string().nullable(),
    imageAltText: z.string().nullable(),
    posts: z.array(postSchema),
  }),
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { strategySummary, imageBrief, posts } = inputData;

    const graphicDesigner = mastra?.getAgent('graphicDesignerAgent');
    if (!graphicDesigner) {
      throw new Error('Graphic Designer agent not found');
    }

    const response = await graphicDesigner.generate(
      `Creative brief from the Content Creator:\n${imageBrief}\n\nProduce the hero image now.`,
      {
        memory: workflowAgentMemory(runId, 'graphic-designer-agent', resourceId),
        structuredOutput: {
          schema: z.object({
            imageUrl: z.string().nullable().describe('URL returned by the generate-image tool'),
            imageAltText: z.string().nullable(),
          }),
        },
      },
    );

    return {
      strategySummary,
      imageUrl: response.object.imageUrl,
      imageAltText: response.object.imageAltText,
      posts,
    };
  },
});

const reviewAndPublishStep = createStep({
  id: 'review-and-publish',
  description: 'Shows the human a preview and, if approved, schedules the posts via Buffer',
  inputSchema: designImageStep.outputSchema,
  outputSchema: z.object({
    published: z.boolean(),
    reason: z.string().optional(),
    results: z.array(publishResultSchema).optional(),
  }),
  resumeSchema: z.object({
    publish: z.boolean().describe('Whether to schedule these posts via Buffer'),
    selectedPlatforms: z
      .array(platformSchema)
      .optional()
      .describe('Subset of previewed platforms to actually publish; defaults to all of them'),
  }),
  suspendSchema: z.object({
    strategySummary: z.string(),
    imageUrl: z.string().nullable(),
    imageAltText: z.string().nullable(),
    posts: z.array(postSchema),
    message: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend, bail, mastra, runId, resourceId }) => {
    const { strategySummary, imageUrl, imageAltText, posts } = inputData;

    if (!resumeData) {
      return await suspend({
        strategySummary,
        imageUrl,
        imageAltText,
        posts,
        message:
          'Review the drafted posts and image. Approve to schedule them via Buffer, or decline to end here without publishing.',
      });
    }

    if (!resumeData.publish) {
      return bail({ published: false, reason: 'User declined to publish.' });
    }

    if (!process.env.BUFFER_API_KEY) {
      return bail({
        published: false,
        reason: 'BUFFER_API_KEY is not configured, so posts could not be scheduled via Buffer.',
      });
    }

    const selectedPlatforms = resumeData.selectedPlatforms;
    const selectedPosts = selectedPlatforms?.length
      ? posts.filter((post) => selectedPlatforms.includes(post.platform))
      : posts;

    const contentCreator = mastra?.getAgent('contentCreatorAgent');
    if (!contentCreator) {
      throw new Error('Content Creator agent not found');
    }

    const toolsets = await getBufferMcpClient().listToolsets();

    const response = await contentCreator.generate(
      `Schedule the following approved social media posts using the connected Buffer tools.

For each post:
1. Look up the Buffer account/organization and its connected channels.
2. Find the connected channel whose service matches the post's platform (account for naming differences, e.g. "twitter" may appear as "twitter" or "x").
3. If no connected channel matches, report status "skipped_no_channel" for that post and continue with the rest - do not fail the whole batch.
4. Otherwise add the post to that channel's Buffer queue (default/queue scheduling unless told otherwise). When the platform supports images, attach the image at ${imageUrl ?? '(no image was generated)'}` +
        `${imageAltText ? ` with alt text "${imageAltText}"` : ''}.
5. Report status "scheduled" with the resulting post id in the detail field on success, or "failed" with the error detail on failure.

Posts to schedule:
${JSON.stringify(selectedPosts, null, 2)}`,
      {
        memory: workflowAgentMemory(runId, 'content-creator-agent', resourceId),
        toolsets,
        structuredOutput: {
          schema: z.object({
            results: z.array(publishResultSchema),
          }),
        },
      },
    );

    return {
      published: true,
      results: response.object.results,
    };
  },
});

export const socialMediaWorkflow = createWorkflow({
  id: 'social-media-workflow',
  description:
    'Turns a saved MDX article into a human-approved, platform-native social media campaign scheduled via Buffer',
  inputSchema: socialMediaWorkflowInputSchema,
  outputSchema: reviewAndPublishStep.outputSchema,
})
  .then(prepareArticleStep)
  .then(strategyStep)
  .then(createContentStep)
  .then(designImageStep)
  .then(reviewAndPublishStep)
  .commit();
