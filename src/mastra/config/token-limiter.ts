import { TokenLimiterProcessor } from '@mastra/core/processors';

/** Max tokens of conversation history sent to the model at each agent step. */
export const INPUT_TOKEN_LIMIT = 16_000;

export const inputTokenLimiter = new TokenLimiterProcessor({
  limit: INPUT_TOKEN_LIMIT,
  trimMode: 'contiguous',
});
