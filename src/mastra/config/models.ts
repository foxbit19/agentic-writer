/**
 * Central model configuration for all agents and background services.
 * Override any model via env for A/B testing (e.g. WRITER_MODEL=openai/gpt-5-mini).
 */

function modelFromEnv(envKey: string, fallback: string): string {
  return process.env[envKey]?.trim() || fallback;
}

/** Article workflow — keep frontier for long-form output quality. */
export const WRITER_MODEL = modelFromEnv('WRITER_MODEL', 'openai/gpt-5');

/** Multi-step tool use + synthesis; mini is the cost floor (not nano). */
export const RESEARCHER_MODEL = modelFromEnv('RESEARCHER_MODEL', 'openai/gpt-5-mini');

/** Rule enforcement; weak editor triggers expensive Writer loops. */
export const EDITOR_MODEL = modelFromEnv('EDITOR_MODEL', 'openai/gpt-4.1-mini');

/** Short structured JSON per platform — bounded, runs once. */
export const STRATEGIST_MODEL = modelFromEnv('STRATEGIST_MODEL', 'openai/gpt-5-nano');

/** Platform-native short copy; mini preserves voice differentiation. */
export const CONTENT_CREATOR_MODEL = modelFromEnv('CONTENT_CREATOR_MODEL', 'openai/gpt-5-mini');

/** Template-like prompt translation + one tool call. */
export const GRAPHIC_DESIGNER_MODEL = modelFromEnv('GRAPHIC_DESIGNER_MODEL', 'openai/gpt-4.1-nano');

/** Background memory compression — lowest stakes. */
export const OBSERVATIONAL_MEMORY_MODEL = modelFromEnv(
  'OBSERVATIONAL_MEMORY_MODEL',
  'openai/gpt-4.1-nano',
);

/** Per-image pricing; mini is cheaper when the brief is already detailed. */
export const IMAGE_GENERATION_MODEL = modelFromEnv('IMAGE_GENERATION_MODEL', 'gpt-image-1-mini');
