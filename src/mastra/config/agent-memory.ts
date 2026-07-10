import { Memory } from '@mastra/memory';

/** Observer/reflector model for background memory compression (uses OPENAI_API_KEY). */
const OBSERVATIONAL_MEMORY_MODEL = 'openai/gpt-4.1-mini';

export const agentMemory = new Memory({
  options: {
    observationalMemory: {
      model: OBSERVATIONAL_MEMORY_MODEL,
    },
  },
});
