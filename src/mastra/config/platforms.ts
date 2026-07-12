import { z } from 'zod';

/**
 * Platforms the pipeline knows how to draft for. Kept to services that work with just
 * text + an optional single image — platforms with heavier requirements (Pinterest boards,
 * YouTube video uploads, TikTok video) are out of scope.
 */
export const SUPPORTED_PLATFORMS = [
  'twitter',
  'linkedin',
  'facebook',
  'instagram',
  'threads',
  'bluesky',
  'mastodon',
] as const;

export const platformSchema = z.enum(SUPPORTED_PLATFORMS);
