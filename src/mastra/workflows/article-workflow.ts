import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { extractUrls } from '../lib/extract-urls';
import { stripDraftRevisionFromMarkdown } from '../lib/markdown';
import { workflowAgentMemory } from '../lib/workflow-memory';
import { appendRevisionGuidance, authorDraftBlock, buildWriterPrompt } from '../lib/writer-prompts';
import { readArticle } from '../tools/read-article-tool';
import {
  finalizeArticle,
  initArticleWorkspace,
  saveDraft,
  saveEditorReview,
  saveHumanNotes,
  saveResearchBrief,
  setArticleStatus,
} from '../lib/articles';

const MAX_EDITOR_PASSES = 3;
const MAX_HUMAN_REVISION_CYCLES = 10;

const editorReviewOutputSchema = z.object({
  ready: z
    .boolean()
    .describe('True when the draft is ready for the human author to approve as-is'),
  review: z
    .string()
    .describe('Concise, actionable editorial review for the Writer and human author'),
});

// Shared state threaded through editor polish and human-approval loops.
// Input and output schemas of each loop must match so it can feed itself on each iteration.
const draftStateSchema = z.object({
  articleId: z.string(),
  notes: z.string(),
  authorDraft: z.string().optional(),
  researchBrief: z.string(),
  draft: z.string(),
  editorReview: z.string(),
  editorReady: z.boolean(),
  editorPassCount: z.number(),
  guidanceNotes: z.string(),
  approved: z.boolean(),
  draftNumber: z.number(),
});

const researchTopicsStep = createStep({
  id: 'research-topics',
  description: 'Extracts topics from author operating instructions and researches them online',
  inputSchema: z.object({
    notes: z
      .string()
      .describe('Author operating instructions — not article body'),
    authorDraft: z
      .string()
      .optional()
      .describe('Optional author-written prose or outline that belongs in the article'),
  }),
  outputSchema: z.object({
    articleId: z.string(),
    notes: z.string(),
    authorDraft: z.string().optional(),
    researchBrief: z.string(),
  }),
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { notes, authorDraft } = inputData;
    const { articleId } = await initArticleWorkspace(runId, notes, authorDraft);

    const researcher = mastra?.getAgent('researcherAgent');
    if (!researcher) {
      throw new Error('Researcher agent not found');
    }

    // Source URLs may live in the notes or in the author draft (e.g. a references list).
    const sourceUrls = extractUrls([notes, authorDraft ?? ''].join('\n'));
    const fetchedSources =
      sourceUrls.length > 0
        ? await Promise.all(
            sourceUrls.map(async (url) => {
              try {
                const article = await readArticle(url);
                return `### ${article.title}\nURL: ${article.url}\n\n${article.textContent}`;
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return `### Failed to fetch ${url}\n${message}`;
              }
            }),
          )
        : [];

    const draftNote = authorDraft?.trim()
      ? '\n\nAn author draft was provided separately for the Writer. Note that it exists; do not rewrite, outline, or quote it in the research brief.'
      : '';

    const researchPrompt =
      sourceUrls.length > 0
        ? `Author operating instructions (not article body):\n\n${notes}${draftNote}\n\nThe instructions and/or author draft include source URL(s). The article must be based ONLY on the fetched source material below (plus any claims already in the author draft if provided) — do not treat the operating instructions as facts to quote, and do not add facts from other sources or general knowledge.\n\nFetched source material:\n\n${fetchedSources.join('\n\n---\n\n')}\n\nProduce a research brief for the Writer from this material only. Do not use web search. Extract author instructions (topics, constraints, article type). Only flag personal content if the instructions explicitly ask to include an anecdote or opinion.`
        : `Author operating instructions (not article body):\n\n${notes}${draftNote}\n\nExtract the topics and constraints from these instructions, research them online, and produce a research brief for the Writer. Include an Author instructions section. Only flag personal content if the instructions explicitly ask to include an anecdote or opinion. Do not treat the operating instructions as article prose.`;

    const response = await researcher.generate(researchPrompt, {
      memory: workflowAgentMemory(runId, 'researcher-agent', resourceId),
    });

    if (!response.text.trim()) {
      throw new Error(
        'Researcher returned an empty brief (it likely exhausted its steps without writing a final answer, often after failing web searches). Aborting so the Writer does not proceed without sources.',
      );
    }

    await saveResearchBrief(articleId, response.text);

    return {
      articleId,
      notes,
      ...(authorDraft?.trim() ? { authorDraft } : {}),
      researchBrief: response.text,
    };
  },
});

const writeDraftStep = createStep({
  id: 'write-draft',
  description: 'Writes (or revises) the article draft as Markdown',
  inputSchema: draftStateSchema,
  outputSchema: draftStateSchema,
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    if (inputData.approved) {
      return inputData;
    }

    const { notes, authorDraft, researchBrief, draft, guidanceNotes } = inputData;
    const draftNumber = inputData.draftNumber + 1;

    const writer = mastra?.getAgent('writerAgent');
    if (!writer) {
      throw new Error('Writer agent not found');
    }

    const isRevision = draft.trim().length > 0;
    const prompt = buildWriterPrompt({
      notes,
      authorDraft,
      researchBrief,
      previousDraft: isRevision ? stripDraftRevisionFromMarkdown(draft) : undefined,
      guidanceNotes,
    });

    const response = await writer.generate(prompt, {
      memory: workflowAgentMemory(runId, 'writer-agent', resourceId),
      // Skill tool + draft; leave room after loading technical-article-writer.
      maxSteps: 12,
    });

    const draftMarkdown = response.text;
    const articleId = await saveDraft(inputData.articleId, draftNumber, draftMarkdown);

    return {
      ...inputData,
      articleId,
      draft: draftMarkdown,
      draftNumber,
    };
  },
});

const reviewDraftStep = createStep({
  id: 'review-draft',
  description: 'Editor reviews the draft against operating instructions and research',
  inputSchema: draftStateSchema,
  outputSchema: draftStateSchema,
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { notes, authorDraft, researchBrief, draft } = inputData;

    const editor = mastra?.getAgent('editorAgent');
    if (!editor) {
      throw new Error('Editor agent not found');
    }

    const response = await editor.generate(
      `Author operating instructions (not article body — check intent; reject drafts that paste or lightly paraphrase these instructions):\n${notes}${authorDraftBlock(authorDraft)}\n\nResearch brief:\n${researchBrief}\n\nDraft to review:\n${draft}\n\nReview this draft. Set ready to true only when the draft is ready for the human author's approval as-is. Set ready to false when the Writer should revise again before human review.${authorDraft?.trim() ? ' When an author draft was provided, flag ignoring or inventing over it without cause.' : ''}`,
      {
        memory: workflowAgentMemory(runId, 'editor-agent', resourceId),
        maxSteps: 10,
        structuredOutput: {
          schema: editorReviewOutputSchema,
        },
      },
    );

    if (!response.object) {
      throw new Error('Editor returned no structured review output');
    }

    const { ready, review } = response.object;
    await saveEditorReview(inputData.articleId, inputData.draftNumber, review);

    return {
      ...inputData,
      editorReview: review,
      editorReady: ready,
      editorPassCount: inputData.editorPassCount + 1,
      guidanceNotes: ready ? inputData.guidanceNotes : appendRevisionGuidance(inputData.guidanceNotes, review),
    };
  },
});

const humanApprovalStep = createStep({
  id: 'human-approval',
  description: 'Submits the draft and editor review to the human author for approval',
  inputSchema: draftStateSchema,
  outputSchema: draftStateSchema,
  resumeSchema: z.object({
    approved: z.boolean().describe('Whether the human author approves this draft'),
    notes: z
      .string()
      .default('')
      .describe('Additional operating instructions for the writer if not approved'),
  }),
  suspendSchema: z.object({
    draft: z.string(),
    editorReview: z.string(),
    editorReady: z.boolean(),
    editorPassCount: z.number(),
    message: z.string(),
    articleId: z.string(),
    draftNumber: z.number(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData) {
      await setArticleStatus(inputData.articleId, 'awaiting_review');
      return await suspend({
        draft: inputData.draft,
        editorReview: inputData.editorReview,
        editorReady: inputData.editorReady,
        editorPassCount: inputData.editorPassCount,
        message: 'Review the draft and editor feedback, then approve or reject with additional notes.',
        articleId: inputData.articleId,
        draftNumber: inputData.draftNumber,
      });
    }

    if (resumeData.approved) {
      return {
        ...inputData,
        approved: true,
      };
    }

    await saveHumanNotes(inputData.articleId, inputData.draftNumber, resumeData.notes);

    return {
      ...inputData,
      approved: false,
      guidanceNotes: appendRevisionGuidance(inputData.guidanceNotes, resumeData.notes),
    };
  },
});

const editorPolishWorkflow = createWorkflow({
  id: 'editor-polish-workflow',
  inputSchema: draftStateSchema,
  outputSchema: draftStateSchema,
})
  .then(writeDraftStep)
  .then(reviewDraftStep)
  .commit();

const humanRevisionCycleWorkflow = createWorkflow({
  id: 'human-revision-cycle-workflow',
  inputSchema: draftStateSchema,
  outputSchema: draftStateSchema,
})
  .then(humanApprovalStep)
  .then(writeDraftStep)
  .commit();

const finalizeArticleStep = createStep({
  id: 'finalize-article',
  description: 'Saves the approved draft to data/articles and returns its id',
  inputSchema: draftStateSchema,
  outputSchema: z.object({
    markdown: z.string(),
    articleId: z.string(),
    title: z.string(),
    completionReason: z.enum(['approved', 'max_iterations_reached']),
  }),
  execute: async ({ inputData }) => {
    const saved = await finalizeArticle(
      inputData.articleId,
      inputData.draft,
      inputData.draftNumber,
    );
    return {
      markdown: saved.markdown,
      articleId: saved.id,
      title: saved.title,
      completionReason: inputData.approved
        ? ('approved' as const)
        : ('max_iterations_reached' as const),
    };
  },
});

export const articleWorkflow = createWorkflow({
  id: 'article-workflow',
  description:
    'Turns author operating instructions (and optional author draft) into a researched, written, and human-approved Markdown article',
  inputSchema: z.object({
    notes: z
      .string()
      .describe('Author operating instructions: article type, topics, sources, constraints — not article body'),
    authorDraft: z
      .string()
      .optional()
      .describe('Optional author-written prose or outline that belongs in the article'),
  }),
  outputSchema: z.object({
    markdown: z.string().describe('The final, human-approved article as Markdown'),
    articleId: z.string().describe('Saved article id in data/articles/'),
    title: z.string().describe('Article title extracted from the Markdown'),
    completionReason: z
      .enum(['approved', 'max_iterations_reached'])
      .describe('Why the draft loop ended — human approval or revision cap'),
  }),
})
  .then(researchTopicsStep)
  .map(async ({ inputData }) => ({
    articleId: inputData.articleId,
    notes: inputData.notes,
    ...(inputData.authorDraft?.trim() ? { authorDraft: inputData.authorDraft } : {}),
    researchBrief: inputData.researchBrief,
    draft: '',
    editorReview: '',
    editorReady: false,
    editorPassCount: 0,
    guidanceNotes: '',
    approved: false,
    draftNumber: 0,
  }))
  .dountil(editorPolishWorkflow, async ({ inputData, iterationCount }) => {
    return inputData.editorReady === true || iterationCount >= MAX_EDITOR_PASSES;
  })
  .dountil(humanRevisionCycleWorkflow, async ({ inputData, iterationCount }) => {
    return inputData.approved === true || iterationCount >= MAX_HUMAN_REVISION_CYCLES;
  })
  .then(finalizeArticleStep)
  .commit();
