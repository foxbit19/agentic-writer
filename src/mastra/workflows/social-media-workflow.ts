import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { getDubMcpClient } from '../tools/dub-mcp-client';
import { platformSchema } from '../config/platforms';
import { workflowAgentMemory } from '../lib/workflow-memory';
import { listSavedArticleIds, readSavedArticle } from '../lib/articles';
import { parseMarkdownArticle } from '../lib/markdown';
import { saveSocialCampaign } from '../lib/social-campaigns';

function buildArticleIdSchema() {
  const ids = listSavedArticleIds();
  if (ids.length === 0) {
    return z
      .string()
      .min(1)
      .describe('No saved articles yet. Run the article workflow first, then restart dev if needed.');
  }
  return z.string().describe('Saved article to promote');
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

const platformStrategySchema = z.object({
  platform: platformSchema,
  angle: z.string(),
  callToAction: z.string(),
  timingGuidance: z.string(),
});

const prepareArticleStep = createStep({
  id: 'prepare-article',
  description: 'Loads a saved Markdown article from data/articles/',
  inputSchema: socialMediaWorkflowInputSchema,
  outputSchema: z.object({
    articleId: z.string(),
    articleUrl: z.string().optional(),
    platforms: z.array(platformSchema),
    articleTitle: z.string(),
    articleText: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { articleId, platforms, articleUrl } = inputData;
    const saved = await readSavedArticle(articleId);
    const { title, textContent } = parseMarkdownArticle(saved.markdown);

    return {
      articleId,
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
    articleId: z.string(),
    articleUrl: z.string().optional(),
    articleTitle: z.string(),
    articleText: z.string(),
    platforms: z.array(platformSchema),
    strategySummary: z.string(),
    platformStrategies: z.array(platformStrategySchema),
  }),
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { articleId, articleUrl, articleTitle, articleText, platforms } = inputData;

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
            platformStrategies: z.array(platformStrategySchema),
          }),
        },
      },
    );

    return {
      articleId,
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
    articleId: z.string(),
    platforms: z.array(platformSchema),
    strategySummary: z.string(),
    platformStrategies: z.array(platformStrategySchema),
    imageBrief: z.string(),
    posts: z.array(postSchema),
  }),
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const {
      articleId,
      articleTitle,
      articleUrl,
      articleText,
      platformStrategies,
      strategySummary,
      platforms,
    } = inputData;

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
      articleId,
      platforms,
      strategySummary,
      platformStrategies,
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
    articleId: z.string(),
    platforms: z.array(platformSchema),
    strategySummary: z.string(),
    platformStrategies: z.array(platformStrategySchema),
    imageBrief: z.string(),
    imageUrl: z.string().nullable(),
    imageAltText: z.string().nullable(),
    posts: z.array(postSchema),
  }),
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const {
      articleId,
      platforms,
      strategySummary,
      platformStrategies,
      imageBrief,
      posts,
    } = inputData;

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
      articleId,
      platforms,
      strategySummary,
      platformStrategies,
      imageBrief,
      imageUrl: response.object.imageUrl,
      imageAltText: response.object.imageAltText,
      posts,
    };
  },
});

const saveCampaignStep = createStep({
  id: 'save-campaign',
  description: 'Saves the social campaign to disk under the article folder',
  inputSchema: designImageStep.outputSchema,
  outputSchema: z.object({
    campaignId: z.string(),
    campaignDir: z.string(),
    posts: z.array(postSchema),
    imageUrl: z.string().nullable(),
  }),
  execute: async ({ inputData, runId }) => {
    const saved = await saveSocialCampaign({
      articleId: inputData.articleId,
      runId,
      platforms: inputData.platforms,
      strategySummary: inputData.strategySummary,
      platformStrategies: inputData.platformStrategies,
      imageBrief: inputData.imageBrief,
      posts: inputData.posts,
      imageUrl: inputData.imageUrl,
      imageAltText: inputData.imageAltText,
    });

    return {
      campaignId: saved.campaignId,
      campaignDir: saved.campaignDir,
      posts: saved.posts,
      imageUrl: saved.imageUrl,
    };
  },
});

export const socialMediaWorkflow = createWorkflow({
  id: 'social-media-workflow',
  description:
    'Turns a saved Markdown article into platform-native social posts and a hero image, saved to disk',
  inputSchema: socialMediaWorkflowInputSchema,
  outputSchema: saveCampaignStep.outputSchema,
})
  .then(prepareArticleStep)
  .then(strategyStep)
  .then(createContentStep)
  .then(designImageStep)
  .then(saveCampaignStep)
  .commit();
