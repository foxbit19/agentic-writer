import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { platformSchema } from '../config/platforms';
import {
  type ArticleStatus,
  getArticleDetail,
  getArticleManifest,
  listAllArticles,
  listArticleDrafts,
} from '../lib/articles';
import { listCampaigns, readCampaign } from '../lib/social-campaigns';

const articleStatusSchema = z.enum(['in_progress', 'awaiting_review', 'approved']);

const suspendPayloadSchema = z
  .object({
    draft: z.string().optional(),
    editorReview: z.string().optional(),
    message: z.string().optional(),
    articleId: z.string().optional(),
    draftNumber: z.number().optional(),
  })
  .passthrough()
  .nullable();

type WorkflowRunResult = {
  status: string;
  suspendPayload?: unknown;
  result?: unknown;
  error?: Error;
};

type MastraWorkflowHandle = {
  createRun: (opts?: { runId?: string }) => Promise<{
    runId: string;
    start: (opts: { inputData: unknown }) => Promise<WorkflowRunResult>;
    resume: (opts: { resumeData: unknown }) => Promise<WorkflowRunResult>;
  }>;
  getWorkflowRunById: (runId: string) => Promise<{ status?: string } | null | undefined>;
};

type MastraLike = {
  getWorkflow: (id: string) => MastraWorkflowHandle;
};

function requireMastra(mastra: unknown): MastraLike {
  if (!mastra || typeof mastra !== 'object' || !('getWorkflow' in mastra)) {
    throw new Error('Mastra instance is not available in tool context');
  }
  return mastra as MastraLike;
}

function summarizeArticleRun(result: WorkflowRunResult, runId: string) {
  const suspendPayload =
    result.status === 'suspended' && result.suspendPayload
      ? (result.suspendPayload as z.infer<typeof suspendPayloadSchema>)
      : null;

  const successResult =
    result.status === 'success' && result.result && typeof result.result === 'object'
      ? (result.result as { markdown?: string; articleId?: string; title?: string })
      : null;

  const articleId =
    suspendPayload?.articleId ?? successResult?.articleId ?? null;

  return {
    runId,
    status: result.status,
    articleId,
    suspendPayload,
    result: successResult,
    error: result.status === 'failed' ? (result.error?.message ?? 'Workflow failed') : null,
  };
}

function summarizeSocialRun(result: WorkflowRunResult, runId: string) {
  const successResult =
    result.status === 'success' && result.result && typeof result.result === 'object'
      ? (result.result as {
          campaignId?: string;
          campaignDir?: string;
          posts?: unknown;
          imageUrl?: string | null;
        })
      : null;

  return {
    runId,
    status: result.status,
    result: successResult,
    error: result.status === 'failed' ? (result.error?.message ?? 'Workflow failed') : null,
  };
}

export const startArticleWorkflowTool = createTool({
  id: 'start_article_workflow',
  description:
    'Start the article workflow from author operating instructions (notes) and an optional author draft. Blocks until the first human-approval suspend (after research, write, and editor review) or until the run completes. Can take several minutes.',
  inputSchema: z.object({
    notes: z
      .string()
      .min(1)
      .describe(
        'Author operating instructions: article type, topics, sources/URLs, constraints — not article body',
      ),
    authorDraft: z
      .string()
      .optional()
      .describe(
        'Optional author-written prose or outline that belongs in the article; the Writer develops this rather than inventing from scratch',
      ),
  }),
  outputSchema: z.object({
    runId: z.string(),
    status: z.string(),
    articleId: z.string().nullable(),
    suspendPayload: suspendPayloadSchema,
    result: z
      .object({
        markdown: z.string().optional(),
        articleId: z.string().optional(),
        title: z.string().optional(),
      })
      .nullable(),
    error: z.string().nullable(),
  }),
  execute: async ({ notes, authorDraft }, context) => {
    const mastra = requireMastra(context?.mastra);
    const workflow = mastra.getWorkflow('articleWorkflow');
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { notes, ...(authorDraft?.trim() ? { authorDraft } : {}) },
    });
    return summarizeArticleRun(result, run.runId);
  },
});

export const listArticlesTool = createTool({
  id: 'list_articles',
  description:
    'List article workspaces under data/articles/. Optionally filter by status (in_progress, awaiting_review, approved).',
  inputSchema: z.object({
    status: articleStatusSchema.optional().describe('Optional status filter'),
  }),
  outputSchema: z.object({
    articles: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        status: articleStatusSchema,
        runId: z.string(),
        currentDraft: z.number(),
        approvedDraft: z.number().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
        savedAt: z.string().optional(),
      }),
    ),
  }),
  execute: async ({ status }) => {
    const articles = await listAllArticles(status as ArticleStatus | undefined);
    return { articles };
  },
});

export const getArticleTool = createTool({
  id: 'get_article',
  description:
    'Get an article manifest and approved Markdown (when present) by article id.',
  inputSchema: z.object({
    articleId: z.string().describe('Article workspace id'),
  }),
  outputSchema: z.object({
    manifest: z.object({
      id: z.string(),
      title: z.string(),
      status: articleStatusSchema,
      runId: z.string(),
      currentDraft: z.number(),
      approvedDraft: z.number().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      savedAt: z.string().optional(),
    }),
    approvedMarkdown: z.string().nullable(),
  }),
  execute: async ({ articleId }) => getArticleDetail(articleId),
});

export const getArticleDraftsTool = createTool({
  id: 'get_article_drafts',
  description:
    'List numbered drafts for an article, including editor reviews and human rejection notes when present.',
  inputSchema: z.object({
    articleId: z.string().describe('Article workspace id'),
  }),
  outputSchema: z.object({
    drafts: z.array(
      z.object({
        draftNumber: z.number(),
        markdown: z.string(),
        editorReview: z.string().nullable(),
        humanNotes: z.string().nullable(),
      }),
    ),
  }),
  execute: async ({ articleId }) => {
    const drafts = await listArticleDrafts(articleId);
    return { drafts };
  },
});

export const getArticleStatusTool = createTool({
  id: 'get_article_status',
  description:
    'Get article writing status from article.json and, when possible, the Mastra workflow run status for the stored runId.',
  inputSchema: z.object({
    articleId: z.string().describe('Article workspace id'),
  }),
  outputSchema: z.object({
    articleId: z.string(),
    title: z.string(),
    status: articleStatusSchema,
    runId: z.string(),
    currentDraft: z.number(),
    approvedDraft: z.number().nullable(),
    updatedAt: z.string(),
    workflowRunStatus: z.string().nullable(),
  }),
  execute: async ({ articleId }, context) => {
    const manifest = await getArticleManifest(articleId);
    let workflowRunStatus: string | null = null;

    try {
      const mastra = requireMastra(context?.mastra);
      const workflow = mastra.getWorkflow('articleWorkflow');
      const runState = await workflow.getWorkflowRunById(manifest.runId);
      workflowRunStatus = runState?.status ?? null;
    } catch {
      workflowRunStatus = null;
    }

    return {
      articleId: manifest.id,
      title: manifest.title,
      status: manifest.status,
      runId: manifest.runId,
      currentDraft: manifest.currentDraft,
      approvedDraft: manifest.approvedDraft,
      updatedAt: manifest.updatedAt,
      workflowRunStatus,
    };
  },
});

export const approveDraftTool = createTool({
  id: 'approve_draft',
  description:
    'Approve the current draft for an article awaiting review. Resumes the suspended article workflow run. May finalize the article or return the next suspend state.',
  inputSchema: z.object({
    articleId: z.string().describe('Article workspace id'),
    notes: z
      .string()
      .optional()
      .describe('Optional notes (usually unused on approval)'),
  }),
  outputSchema: z.object({
    runId: z.string(),
    status: z.string(),
    articleId: z.string().nullable(),
    suspendPayload: suspendPayloadSchema,
    result: z
      .object({
        markdown: z.string().optional(),
        articleId: z.string().optional(),
        title: z.string().optional(),
      })
      .nullable(),
    error: z.string().nullable(),
  }),
  execute: async ({ articleId, notes }, context) => {
    const mastra = requireMastra(context?.mastra);
    const manifest = await getArticleManifest(articleId);
    if (manifest.status !== 'awaiting_review') {
      throw new Error(
        `Article "${articleId}" is not awaiting review (status: ${manifest.status})`,
      );
    }

    const workflow = mastra.getWorkflow('articleWorkflow');
    const run = await workflow.createRun({ runId: manifest.runId });
    const result = await run.resume({
      resumeData: { approved: true, notes: notes ?? '' },
    });
    return summarizeArticleRun(result, run.runId);
  },
});

export const rejectDraftTool = createTool({
  id: 'reject_draft',
  description:
    'Reject the current draft with guidance notes. Resumes the suspended article workflow so the Writer revises. Blocks until the next approval suspend or completion.',
  inputSchema: z.object({
    articleId: z.string().describe('Article workspace id'),
    notes: z.string().min(1).describe('Guidance for the Writer on what to change'),
  }),
  outputSchema: z.object({
    runId: z.string(),
    status: z.string(),
    articleId: z.string().nullable(),
    suspendPayload: suspendPayloadSchema,
    result: z
      .object({
        markdown: z.string().optional(),
        articleId: z.string().optional(),
        title: z.string().optional(),
      })
      .nullable(),
    error: z.string().nullable(),
  }),
  execute: async ({ articleId, notes }, context) => {
    const mastra = requireMastra(context?.mastra);
    const manifest = await getArticleManifest(articleId);
    if (manifest.status !== 'awaiting_review') {
      throw new Error(
        `Article "${articleId}" is not awaiting review (status: ${manifest.status})`,
      );
    }

    const workflow = mastra.getWorkflow('articleWorkflow');
    const run = await workflow.createRun({ runId: manifest.runId });
    const result = await run.resume({
      resumeData: { approved: false, notes },
    });
    return summarizeArticleRun(result, run.runId);
  },
});

export const startSocialMediaWorkflowTool = createTool({
  id: 'start_social_media_workflow',
  description:
    'Start the social media workflow for an approved article. Blocks until the campaign (posts + hero image) is saved to disk.',
  inputSchema: z.object({
    articleId: z.string().describe('Approved article workspace id'),
    platforms: z
      .array(platformSchema)
      .min(1)
      .describe('Target social platforms'),
    articleUrl: z
      .string()
      .url()
      .optional()
      .describe('Optional published URL for post CTAs and Dub link shortening'),
  }),
  outputSchema: z.object({
    runId: z.string(),
    status: z.string(),
    result: z
      .object({
        campaignId: z.string().optional(),
        campaignDir: z.string().optional(),
        posts: z.unknown().optional(),
        imageUrl: z.string().nullable().optional(),
      })
      .nullable(),
    error: z.string().nullable(),
  }),
  execute: async ({ articleId, platforms, articleUrl }, context) => {
    const mastra = requireMastra(context?.mastra);
    const workflow = mastra.getWorkflow('socialMediaWorkflow');
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { articleId, platforms, articleUrl },
    });
    return summarizeSocialRun(result, run.runId);
  },
});

export const listSocialCampaignsTool = createTool({
  id: 'list_social_campaigns',
  description: 'List social campaigns saved under an article folder.',
  inputSchema: z.object({
    articleId: z.string().describe('Article workspace id'),
  }),
  outputSchema: z.object({
    campaigns: z.array(
      z.object({
        campaignId: z.string(),
        articleId: z.string(),
        platforms: z.array(z.string()),
        savedAt: z.string().nullable(),
        imageUrl: z.string().nullable(),
        campaignDir: z.string(),
      }),
    ),
  }),
  execute: async ({ articleId }) => {
    const campaigns = await listCampaigns(articleId);
    return { campaigns };
  },
});

export const getSocialCampaignTool = createTool({
  id: 'get_social_campaign',
  description:
    'Get a social campaign: posts, publication strategy (including timing / best-time guidance), and hero image metadata/URL/path.',
  inputSchema: z.object({
    articleId: z.string().describe('Article workspace id'),
    campaignId: z.string().describe('Campaign id under the article social/ folder'),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    articleId: z.string(),
    campaignDir: z.string(),
    platforms: z.array(z.string()),
    savedAt: z.string().nullable(),
    strategy: z.string().nullable(),
    imageBrief: z.string().nullable(),
    posts: z.array(
      z.object({
        platform: z.string(),
        markdown: z.string(),
      }),
    ),
    heroImage: z.object({
      filename: z.string(),
      url: z.string().nullable(),
      altText: z.string().nullable(),
      path: z.string().nullable(),
    }),
  }),
  execute: async ({ articleId, campaignId }) => readCampaign(articleId, campaignId),
});

export const writerMcpTools = {
  start_article_workflow: startArticleWorkflowTool,
  list_articles: listArticlesTool,
  get_article: getArticleTool,
  get_article_drafts: getArticleDraftsTool,
  get_article_status: getArticleStatusTool,
  approve_draft: approveDraftTool,
  reject_draft: rejectDraftTool,
  start_social_media_workflow: startSocialMediaWorkflowTool,
  list_social_campaigns: listSocialCampaignsTool,
  get_social_campaign: getSocialCampaignTool,
};
