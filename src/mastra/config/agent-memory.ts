import { Memory } from '@mastra/memory';
import { OBSERVATIONAL_MEMORY_MODEL } from './models';

export const agentMemory = new Memory({
  options: {
    observationalMemory: {
      model: OBSERVATIONAL_MEMORY_MODEL,
    },
  },
});
