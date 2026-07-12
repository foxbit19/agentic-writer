/** Article workspace folder names: snake_case slug + short id. */
export const ARTICLE_ID_PATTERN = /^[a-z0-9_]+$/i;

/** Campaign folder names: ISO-ish timestamp + short run id. */
export const CAMPAIGN_ID_PATTERN = /^[0-9TZ_-]+_[a-z0-9]+$/i;

/**
 * Returns whether `articleId` is a safe path segment (no traversal / special chars).
 *
 * @param articleId - Candidate article workspace id
 */
export function isSafeArticleId(articleId: string): boolean {
  return ARTICLE_ID_PATTERN.test(articleId);
}

/**
 * Returns whether `campaignId` is a safe path segment (no traversal / special chars).
 *
 * @param campaignId - Candidate campaign id
 */
export function isSafeCampaignId(campaignId: string): boolean {
  return CAMPAIGN_ID_PATTERN.test(campaignId);
}

/**
 * Throws if `articleId` is not a safe path segment under `data/articles/`.
 *
 * @param articleId - Candidate article workspace id
 * @throws {Error} When the id contains path traversal or disallowed characters
 */
export function assertSafeArticleId(articleId: string): void {
  if (!isSafeArticleId(articleId)) {
    throw new Error(`Invalid article id "${articleId}"`);
  }
}

/**
 * Throws if `campaignId` is not a safe path segment under an article's `social/` folder.
 *
 * @param campaignId - Candidate campaign id
 * @throws {Error} When the id contains path traversal or disallowed characters
 */
export function assertSafeCampaignId(campaignId: string): void {
  if (!isSafeCampaignId(campaignId)) {
    throw new Error(`Invalid campaign id "${campaignId}"`);
  }
}
