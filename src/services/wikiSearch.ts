/**
 * Frontend wrapper for `/api/proxy/wiki-search`. Used by TopicInputBand's
 * autocomplete-as-you-type. Returns up to 5 candidate articles for a
 * topic query (typo tolerance + disambiguation handled server-side via
 * Wikipedia's OpenSearch).
 *
 * Wikipedia OpenSearch examples (real responses):
 *   "stoicsm"             → ["Stoicism", "Stoic", "Stoicism (album)", ...]
 *   "what is dark matter" → ["Dark matter", ...]
 *   "mercury"             → ["Mercury", "Mercury (planet)", "Mercury (element)", ...]
 */

export interface WikiResult {
  title: string;
  description: string;
  url: string;
}

interface WikiSearchResponse {
  results: WikiResult[];
  cached?: boolean;
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
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const res = await fetch(`/api/proxy/wiki-search?q=${encodeURIComponent(trimmed)}`, {
      credentials: 'include',
      signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as WikiSearchResponse;
    return Array.isArray(data.results) ? data.results : [];
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
 * Last-resort URL constructor for when /api/proxy/wiki-search is
 * unreachable. Mirrors Wikipedia's URL scheme: first letter of each
 * word capitalised, spaces → underscores. Wikipedia normalises case
 * and redirects on close matches, so a wide range of inputs land
 * correctly even without OpenSearch.
 */
export function fallbackWikiUrl(topic: string): string {
  const titleCased = topic
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_');
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(titleCased)}`;
}
