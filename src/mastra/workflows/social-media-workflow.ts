import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { shortenUrl } from '../lib/shorten-url';
import { platformSchema } from '../config/platforms';
import { workflowAgentMemory } from '../lib/workflow-memory';
import { listSavedArticleIds, readSavedArticle } from '../lib/articles';
import { parseMarkdownArticle } from '../lib/markdown';
import { initSocialCampaignWorkspace, saveSocialCampaign } from '../lib/social-campaigns';

/**
 * Builds a Zod schema for selecting a saved article id in Studio.
 *
 * @returns String schema with a dropdown-friendly description of available articles
 */
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
    .describe('Optional published URL for post CTAs; shortened via Dub when DUB_API_KEY is set'),
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
      // Shortened once here so every downstream agent only ever sees the final link.
      articleUrl: articleUrl ? await shortenUrl(articleUrl) : undefined,
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

    const urlLine = articleUrl ? `Article URL (copy it exactly as given wherever a link belongs): ${articleUrl}\n` : '';

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

const initCampaignStep = createStep({
  id: 'init-campaign',
  description: 'Creates the campaign folder under the article before posts and hero image run in parallel',
  inputSchema: strategyStep.outputSchema,
  outputSchema: z.object({
    articleId: z.string(),
    articleUrl: z.string().optional(),
    articleTitle: z.string(),
    articleText: z.string(),
    campaignId: z.string(),
    campaignDir: z.string(),
    platforms: z.array(platformSchema),
    strategySummary: z.string(),
    platformStrategies: z.array(platformStrategySchema),
  }),
  execute: async ({ inputData, runId }) => {
    const { campaignId, campaignDir } = await initSocialCampaignWorkspace(
      inputData.articleId,
      runId,
    );

    return {
      articleId: inputData.articleId,
      articleUrl: inputData.articleUrl,
      articleTitle: inputData.articleTitle,
      articleText: inputData.articleText,
      campaignId,
      campaignDir,
      platforms: inputData.platforms,
      strategySummary: inputData.strategySummary,
      platformStrategies: inputData.platformStrategies,
    };
  },
});

const createContentOutputSchema = z.object({
  articleId: z.string(),
  articleTitle: z.string(),
  campaignId: z.string(),
  campaignDir: z.string(),
  platforms: z.array(platformSchema),
  strategySummary: z.string(),
  platformStrategies: z.array(platformStrategySchema),
  posts: z.array(postSchema),
});

const designImageOutputSchema = z.object({
  articleId: z.string(),
  articleTitle: z.string(),
  campaignId: z.string(),
  campaignDir: z.string(),
  imageUrl: z.string().nullable(),
  imageAltText: z.string().nullable(),
});

const createContentStep = createStep({
  id: 'create-content',
  description: 'The Content Creator writes platform-native posts',
  inputSchema: initCampaignStep.outputSchema,
  outputSchema: createContentOutputSchema,
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const {
      articleId,
      articleTitle,
      articleUrl,
      articleText,
      campaignId,
      campaignDir,
      platformStrategies,
      strategySummary,
      platforms,
    } = inputData;

    const contentCreator = mastra?.getAgent('contentCreatorAgent');
    if (!contentCreator) {
      throw new Error('Content Creator agent not found');
    }

    const urlLine = articleUrl ? `Article URL (copy it exactly as given wherever a link belongs): ${articleUrl}\n` : '';

    const response = await contentCreator.generate(
      `Article title: ${articleTitle}\n${urlLine}\nArticle content:\n${articleText}\n\nPublication strategy: ${strategySummary}\n\nPer-platform strategy:\n${JSON.stringify(platformStrategies, null, 2)}\n\nWrite the posts now.`,
      {
        memory: workflowAgentMemory(runId, 'content-creator-agent', resourceId),
        structuredOutput: {
          schema: z.object({
            posts: z.array(postSchema),
          }),
        },
      },
    );

    return {
      articleId,
      articleTitle,
      campaignId,
      campaignDir,
      platforms,
      strategySummary,
      platformStrategies,
      posts: response.object.posts,
    };
  },
});

const designImageStep = createStep({
  id: 'design-image',
  description: 'The Graphic Designer creates one on-brand hero image from the article title only',
  inputSchema: initCampaignStep.outputSchema,
  outputSchema: designImageOutputSchema,
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { articleId, articleTitle, campaignId, campaignDir } = inputData;

    const graphicDesigner = mastra?.getAgent('graphicDesignerAgent');
    if (!graphicDesigner) {
      throw new Error('Graphic Designer agent not found');
    }

    const response = await graphicDesigner.generate(
      `Article title: ${articleTitle}\n\nCreate one on-brand hero image that visually expresses this title only. Do not use article body, claims, or post copy. Use simple schematic figures when they clarify the idea.\n\nSave the hero image inside the article campaign folder.\noutputDir: ${campaignDir}\narticleId: ${articleId}\ncampaignId: ${campaignId}\n\nProduce the hero image now.`,
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
      articleTitle,
      campaignId,
      campaignDir,
      imageUrl: response.object.imageUrl,
      imageAltText: response.object.imageAltText,
    };
  },
});

const saveCampaignStep = createStep({
  id: 'save-campaign',
  description: 'Saves the social campaign to disk under the article folder',
  inputSchema: z.object({
    'create-content': createContentOutputSchema,
    'design-image': designImageOutputSchema,
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    campaignDir: z.string(),
    posts: z.array(postSchema),
    imageUrl: z.string().nullable(),
  }),
  execute: async ({ inputData, runId }) => {
    const content = inputData['create-content'];
    const image = inputData['design-image'];

    const saved = await saveSocialCampaign({
      articleId: content.articleId,
      articleTitle: content.articleTitle,
      campaignId: content.campaignId,
      campaignDir: content.campaignDir,
      runId,
      platforms: content.platforms,
      strategySummary: content.strategySummary,
      platformStrategies: content.platformStrategies,
      posts: content.posts,
      imageUrl: image.imageUrl,
      imageAltText: image.imageAltText,
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
  .then(initCampaignStep)
  .parallel([createContentStep, designImageStep])
  .then(saveCampaignStep)
  .commit();
