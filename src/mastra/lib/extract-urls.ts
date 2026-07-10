const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;

/** Strip trailing punctuation often pasted after a URL in prose. */
function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?)]+$/, '');
}

/** Returns unique HTTP(S) URLs found in free-form author notes. */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  return [...new Set(matches.map(trimTrailingPunctuation))];
}
