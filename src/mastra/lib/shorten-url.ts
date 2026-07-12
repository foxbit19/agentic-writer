const DUB_UPSERT_ENDPOINT = 'https://api.dub.co/links/upsert';
const SHORTEN_TIMEOUT_MS = 10_000;

/**
 * Shortens a URL through Dub's link upsert API. Upsert is idempotent: re-running with the
 * same destination URL returns the existing short link instead of creating a duplicate.
 *
 * Never throws — when `DUB_API_KEY` is unset, the request fails, or the response has no
 * `shortLink`, it logs a warning and returns the original URL so the caller always has a
 * usable link.
 *
 * @param url - Absolute destination URL to shorten
 * @returns The Dub short link, or the original URL when shortening is unavailable
 */
export async function shortenUrl(url: string): Promise<string> {
  const apiKey = process.env.DUB_API_KEY;
  if (!apiKey) {
    return url;
  }

  try {
    const response = await fetch(DUB_UPSERT_ENDPOINT, {
      // Dub's upsert endpoint only accepts PUT; POST responds 405.
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(SHORTEN_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`Dub link upsert for ${url} failed with status ${response.status}; using the original URL`);
      return url;
    }

    const link = (await response.json()) as { shortLink?: string };
    if (!link.shortLink) {
      console.warn(`Dub link upsert for ${url} returned no shortLink; using the original URL`);
      return url;
    }

    return link.shortLink;
  } catch (error) {
    console.warn(`Dub link upsert for ${url} failed; using the original URL`, error);
    return url;
  }
}
