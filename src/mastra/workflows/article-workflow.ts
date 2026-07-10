import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { workflowAgentMemory } from '../lib/workflow-memory';
import { saveArticle } from '../lib/articles';

const MAX_REVISION_ITERATIONS = 10;

// Shared state threaded through the write -> review -> human-approval loop.
// Input and output schemas of the loop must match so it can feed itself on each iteration.
const draftStateSchema = z.object({
  notes: z.string(),
  researchBrief: z.string(),
  draft: z.string(),
  editorReview: z.string(),
  guidanceNotes: z.string(),
  approved: z.boolean(),
});

const researchTopicsStep = createStep({
  id: 'research-topics',
  description: 'Extracts topics from the notes and researches them online',
  inputSchema: z.object({
    notes: z.string().describe('Raw author notes to build the article from'),
  }),
  outputSchema: z.object({
    notes: z.string(),
    researchBrief: z.string(),
  }),
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { notes } = inputData;

    const researcher = mastra?.getAgent('researcherAgent');
    if (!researcher) {
      throw new Error('Researcher agent not found');
    }

    const response = await researcher.generate(
      `Here are the author's notes for an upcoming article:\n\n${notes}\n\nExtract the topics, research them online, and produce a research brief for the Writer, including a section that flags any personal content from the notes to preserve.`,
      { memory: workflowAgentMemory(runId, 'researcher-agent', resourceId) },
    );

    return {
      notes,
      researchBrief: response.text,
    };
  },
});

const writeDraftStep = createStep({
  id: 'write-draft',
  description: 'Writes (or revises) the article draft as MDX',
  inputSchema: draftStateSchema,
  outputSchema: draftStateSchema,
  execute: async ({ inputData, mastra, runId, resourceId }) => {
    const { notes, researchBrief, draft, guidanceNotes } = inputData;

    const writer = mastra?.getAgent('writerAgent');
    if (!writer) {
      throw new Error('Writer agent not found');
    }

    const isRevision = draft.trim().length > 0;
    const prompt = isRevision
      ? `Author notes:\n${notes}\n\nResearch brief:\n${researchBrief}\n\nPrevious draft:\n${draft}\n\nGuidance for this revision (from the editor and/or the human author):\n${guidanceNotes}\n\nRevise the draft to fully address this guidance and return the complete updated MDX article.`
      : `Author notes:\n${notes}\n\nResearch brief:\n${researchBrief}\n\nWrite the article as a complete MDX document.`;

    const response = await writer.generate(prompt, {
      memory: workflowAgentMemory(runId, 'writer-agent', resourceId),
    });

    return {
      ...inputData,
      draft: response.text,
      editorReview: '',
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
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData) {
      return await suspend({
        draft: inputData.draft,
        editorReview: inputData.editorReview,
        message: 'Review the draft and editor feedback, then approve or reject with additional notes.',
      });
    }

    if (resumeData.approved) {
      return {
        ...inputData,
        approved: true,
      };
    }

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
    mdx: z.string(),
    articleId: z.string(),
    title: z.string(),
  }),
  execute: async ({ inputData }) => {
    const saved = await saveArticle(inputData.draft);
    return {
      mdx: saved.mdx,
      articleId: saved.id,
      title: saved.title,
    };
  },
});

export const articleWorkflow = createWorkflow({
  id: 'article-workflow',
  description: 'Turns author notes into a researched, written, and human-approved MDX article',
  inputSchema: z.object({
    notes: z.string().describe('Raw notes to write the article from'),
  }),
  outputSchema: z.object({
    mdx: z.string().describe('The final, human-approved article as MDX'),
    articleId: z.string().describe('Saved article id in data/articles/'),
    title: z.string().describe('Article title extracted from the MDX'),
  }),
})
  .then(researchTopicsStep)
  .map(async ({ inputData }) => ({
    notes: inputData.notes,
    researchBrief: inputData.researchBrief,
    draft: '',
    editorReview: '',
    guidanceNotes: '',
    approved: false,
  }))
  .dountil(draftReviewWorkflow, async ({ inputData, iterationCount }) => {
    if (iterationCount >= MAX_REVISION_ITERATIONS) {
      throw new Error('Maximum revision iterations reached without human approval');
    }
    return inputData.approved === true;
  })
  .then(finalizeArticleStep)
  .commit();
