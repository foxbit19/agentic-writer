import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { extractUrls } from '../lib/extract-urls';
import { applyDraftRevisionToMarkdown, stripDraftRevisionFromMarkdown } from '../lib/markdown';
import { workflowAgentMemory } from '../lib/workflow-memory';
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

const MAX_REVISION_ITERATIONS = 10;

// Shared state threaded through the write -> review -> human-approval loop.
// Input and output schemas of the loop must match so it can feed itself on each iteration.
const draftStateSchema = z.object({
  articleId: z.string(),
  notes: z.string(),
  researchBrief: z.string(),
  draft: z.string(),
  editorReview: z.string(),
  guidanceNotes: z.string(),
  approved: z.boolean(),
  draftNumber: z.number(),
});

const researchTopicsStep = createStep({
  id: 'research-topics',
  description: 'Extracts topics from the notes and researches them online',
  inputSchema: z.object({
    notes: z.string().describe('Raw author notes to build the article from'),
  }),
  outputSchema: z.object({
    articleId: z.string(),
    notes: z.string(),
    researchBrief: z.string(),
  }),
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { notes } = inputData;
    const { articleId } = await initArticleWorkspace(runId, notes);

    const researcher = mastra?.getAgent('researcherAgent');
    if (!researcher) {
      throw new Error('Researcher agent not found');
    }

    const sourceUrls = extractUrls(notes);
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

    const researchPrompt =
      sourceUrls.length > 0
        ? `Here are the author's notes for an upcoming article:\n\n${notes}\n\nThe notes include source URL(s). The article must be based ONLY on these notes and the fetched source material below — do not add facts from other sources or general knowledge.\n\nFetched source material:\n\n${fetchedSources.join('\n\n---\n\n')}\n\nProduce a research brief for the Writer from this material only. Do not use web search. Flag any personal content from the notes to preserve.`
        : `Here are the author's notes for an upcoming article:\n\n${notes}\n\nExtract the topics, research them online, and produce a research brief for the Writer, including a section that flags any personal content from the notes to preserve.`;

    const response = await researcher.generate(researchPrompt, {
      memory: workflowAgentMemory(runId, 'researcher-agent', resourceId),
    });

    await saveResearchBrief(articleId, response.text);

    return {
      articleId,
      notes,
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
    const { notes, researchBrief, draft, guidanceNotes } = inputData;
    const draftNumber = inputData.draftNumber + 1;

    const writer = mastra?.getAgent('writerAgent');
    if (!writer) {
      throw new Error('Writer agent not found');
    }

    const isRevision = draft.trim().length > 0;
    const previousDraft = isRevision ? stripDraftRevisionFromMarkdown(draft) : '';
    const prompt = isRevision
      ? `Author notes:\n${notes}\n\nResearch brief:\n${researchBrief}\n\nPrevious draft:\n${previousDraft}\n\nGuidance for this revision (from the editor and/or the human author):\n${guidanceNotes}\n\nRevise the draft to fully address this guidance and return the complete updated Markdown article. Do not add a revision number to the H1 title — the workflow adds that automatically.`
      : `Author notes:\n${notes}\n\nResearch brief:\n${researchBrief}\n\nWrite the article as a complete Markdown document. Do not add a revision number to the H1 title — the workflow adds that automatically.`;

    const response = await writer.generate(prompt, {
      memory: workflowAgentMemory(runId, 'writer-agent', resourceId),
    });

    const draftMarkdown = applyDraftRevisionToMarkdown(response.text, draftNumber);
    const articleId = await saveDraft(inputData.articleId, draftNumber, draftMarkdown);

    return {
      ...inputData,
      articleId,
      draft: draftMarkdown,
      editorReview: '',
      draftNumber,
    };
  },
});

const reviewDraftStep = createStep({
  id: 'review-draft',
  description: 'Editor reviews the draft against notes and research',
  inputSchema: draftStateSchema,
  outputSchema: draftStateSchema,
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { notes, researchBrief, draft } = inputData;

    const editor = mastra?.getAgent('editorAgent');
    if (!editor) {
      throw new Error('Editor agent not found');
    }

    const response = await editor.generate(
      `Author notes:\n${notes}\n\nResearch brief:\n${researchBrief}\n\nDraft to review:\n${draft}\n\nReview this draft and tell me whether it's ready for the author's approval.`,
      { memory: workflowAgentMemory(runId, 'editor-agent', resourceId) },
    );

    await saveEditorReview(inputData.articleId, inputData.draftNumber, response.text);

    return {
      ...inputData,
      editorReview: response.text,
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
    notes: z.string().default('').describe('Additional guidance for the writer if not approved'),
  }),
  suspendSchema: z.object({
    draft: z.string(),
    editorReview: z.string(),
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
      guidanceNotes: resumeData.notes,
    };
  },
});

const draftReviewWorkflow = createWorkflow({
  id: 'draft-review-workflow',
  inputSchema: draftStateSchema,
  outputSchema: draftStateSchema,
})
  .then(writeDraftStep)
  .then(reviewDraftStep)
  .then(humanApprovalStep)
  .commit();

const finalizeArticleStep = createStep({
  id: 'finalize-article',
  description: 'Saves the approved draft to data/articles and returns its id',
  inputSchema: draftStateSchema,
  outputSchema: z.object({
    markdown: z.string(),
    articleId: z.string(),
    title: z.string(),
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
    };
  },
});

export const articleWorkflow = createWorkflow({
  id: 'article-workflow',
  description: 'Turns author notes into a researched, written, and human-approved Markdown article',
  inputSchema: z.object({
    notes: z.string().describe('Raw notes to write the article from'),
  }),
  outputSchema: z.object({
    markdown: z.string().describe('The final, human-approved article as Markdown'),
    articleId: z.string().describe('Saved article id in data/articles/'),
    title: z.string().describe('Article title extracted from the Markdown'),
  }),
})
  .then(researchTopicsStep)
  .map(async ({ inputData }) => ({
    articleId: inputData.articleId,
    notes: inputData.notes,
    researchBrief: inputData.researchBrief,
    draft: '',
    editorReview: '',
    guidanceNotes: '',
    approved: false,
    draftNumber: 0,
  }))
  .dountil(draftReviewWorkflow, async ({ inputData, iterationCount }) => {
    if (iterationCount >= MAX_REVISION_ITERATIONS) {
      throw new Error('Maximum revision iterations reached without human approval');
    }
    return inputData.approved === true;
  })
  .then(finalizeArticleStep)
  .commit();
