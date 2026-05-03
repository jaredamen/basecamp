/**
 * Wikipedia autocomplete search. Used by TopicInputBand's
 * autocomplete-as-you-type. Returns up to 5 candidate articles for a
 * topic query (typo tolerance + disambiguation handled server-side via
 * Wikipedia's OpenSearch).
 *
 * Wikipedia OpenSearch examples (real responses):
 *   "stoicsm"             → ["Stoicism", "Stoic", "Stoicism (album)", ...]
 *   "what is dark matter" → ["Dark matter", ...]
 *   "mercury"             → ["Mercury", "Mercury (planet)", "Mercury (element)", ...]
 *
 * We hit Wikipedia directly from the browser with `origin=*` for CORS.
 * No backend proxy: Wikipedia data is public, the per-deployment
 * serverless-function budget on Vercel's Hobby tier (12 functions max)
 * doesn't have room for one. Per-session in-memory cache here makes
 * repeat queries instant.
 */

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const RESULT_LIMIT = 5;
const MAX_QUERY_LEN = 200;

export interface WikiResult {
  title: string;
  description: string;
  url: string;
}

// Per-session cache. Re-typing the same prefix while exploring the
// autocomplete chips is cheap. Bounded so we don't leak memory for
// truly weird usage patterns.
const cache = new Map<string, WikiResult[]>();
const CACHE_MAX = 200;

function getCached(key: string): WikiResult[] | null {
  return cache.has(key) ? (cache.get(key) ?? null) : null;
}

function setCached(key: string, results: WikiResult[]): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, results);
}

/**
 * One-shot search. Uses an AbortController so callers can cancel a
 * pending search when the user types again before this one resolves.
 * Returns [] on any non-200 response or network error — the caller
 * surfaces a friendly fallback message.
 */
export async function wikiSearch(
  query: string,
  signal?: AbortSignal,
): Promise<WikiResult[]> {
  const trimmed = query.trim().slice(0, MAX_QUERY_LEN);
  if (!trimmed) return [];

  const cacheKey = trimmed.toLowerCase();
  const hit = getCached(cacheKey);
  if (hit) return hit;

  const params = new URLSearchParams({
    action: 'opensearch',
    search: trimmed,
    limit: String(RESULT_LIMIT),
    namespace: '0',
    format: 'json',
    origin: '*',
  });

  try {
    const res = await fetch(`${WIKI_API}?${params}`, { signal });
    if (!res.ok) return [];
    // OpenSearch shape: [query, [titles…], [descriptions…], [urls…]]
    const data = (await res.json()) as [string, string[], string[], string[]];
    const titles = Array.isArray(data[1]) ? data[1] : [];
    const descriptions = Array.isArray(data[2]) ? data[2] : [];
    const urls = Array.isArray(data[3]) ? data[3] : [];

    const results: WikiResult[] = titles
      .map((title, idx) => ({
        title,
        description: descriptions[idx] ?? '',
        url: urls[idx] ?? '',
      }))
      .filter(r => r.title && r.url);

    setCached(cacheKey, results);
    return results;
  } catch (err) {
    // AbortError when a newer call superseded this one — caller has
    // already moved on. Other errors fail silently and fall back to
    // "0 results" UI which the user can route around.
    if (err instanceof DOMException && err.name === 'AbortError') return [];
    console.warn('wikiSearch failed', err);
    return [];
  }
}

/**
 * Last-resort URL constructor for when Wikipedia's API is unreachable.
 * Mirrors Wikipedia's URL scheme: first letter of each word capitalised,
 * spaces → underscores. Wikipedia normalises case and redirects on close
 * matches, so a wide range of inputs land correctly even without
 * OpenSearch.
 */
export function fallbackWikiUrl(topic: string): string {
  const titleCased = topic
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_');
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(titleCased)}`;
}
