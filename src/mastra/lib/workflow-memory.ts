import type { AgentMemoryOption } from '@mastra/core/agent';

const DEFAULT_RESOURCE_ID = 'agentic-writer';

/** Scopes agent memory to a workflow run and agent so threads don't collide. */
export function workflowAgentMemory(
  runId: string,
  agentId: string,
  resourceId?: string,
): AgentMemoryOption {
  return {
    thread: `${runId}:${agentId}`,
    resource: resourceId ?? DEFAULT_RESOURCE_ID,
  };
}
