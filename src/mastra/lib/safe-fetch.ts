import dns from 'node:dns/promises';
import net from 'node:net';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;

/**
 * Returns whether an IP address is private, loopback, link-local, or otherwise non-public.
 *
 * @param ip - IPv4 or IPv6 address string
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b, c] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0 && c === 0) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA
    if (normalized.startsWith('fe80')) return true; // link-local
    const mapped = normalized.match(/:ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }

  return true;
}

/**
 * Resolves a hostname and rejects private / reserved addresses.
 *
 * @param hostname - Host from a URL (name or literal IP)
 * @throws {Error} When the host is blocked or resolves to a private IP
 */
async function assertPublicHostname(hostname: string): Promise<void> {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === 'metadata.google.internal'
  ) {
    throw new Error(`Blocked hostname: ${hostname}`);
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Blocked private IP: ${hostname}`);
    }
    return;
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) {
    throw new Error(`Could not resolve hostname: ${hostname}`);
  }
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(`Blocked private IP for ${hostname}: ${address}`);
    }
  }
}

/**
 * Parses a URL and ensures it uses http(s) and targets a public host.
 *
 * @param urlString - Absolute URL to validate
 * @returns The parsed URL
 * @throws {Error} When the URL is invalid, uses a disallowed scheme, or targets a private host
 */
export async function assertSafePublicUrl(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new Error('URLs with credentials are not allowed');
  }

  await assertPublicHostname(url.hostname);
  return url;
}

/**
 * Reads a response body as UTF-8 text, aborting if it exceeds `maxBytes`.
 *
 * @param response - Fetch response whose body to read
 * @param maxBytes - Maximum allowed body size in bytes
 */
export async function readTextCapped(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error(`Response too large (${contentLength} bytes)`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      throw new Error(`Response too large (exceeded ${maxBytes} bytes)`);
    }
    return text;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response too large (exceeded ${maxBytes} bytes)`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Fetches a public http(s) URL with SSRF guards, redirect re-validation, timeout, and size cap.
 *
 * @param urlString - Absolute URL to fetch
 * @param init - Optional fetch options (headers, etc.); `redirect` and `signal` are controlled here
 * @returns The final non-redirect response
 */
export async function safeFetch(urlString: string, init?: RequestInit): Promise<Response> {
  let currentUrl = await assertSafePublicUrl(urlString);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(currentUrl, {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Redirect without Location from ${currentUrl.href}`);
        }
        const next = new URL(location, currentUrl);
        currentUrl = await assertSafePublicUrl(next.href);
        continue;
      }

      return response;
    }

    throw new Error(`Too many redirects fetching ${urlString}`);
  } finally {
    clearTimeout(timeout);
  }
}

export const SAFE_FETCH_MAX_BYTES = MAX_RESPONSE_BYTES;
