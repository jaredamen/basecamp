import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth.js';

// GET /api/proxy/wiki-search?q={query}
// Proxies Wikipedia's OpenSearch endpoint so the frontend can offer
// typo-tolerant + disambiguation-aware autocomplete for the topic
// input. Wikipedia's OpenSearch handles all the language smarts
// (typos, natural-language queries, multiple meanings) — we just
// reshape the response and cache it briefly.
//
// Auth-required: matches the policy "every LLM-proxying endpoint
// requires auth" (this isn't an LLM endpoint, but follows the same
// no-anonymous-call posture).

const FETCH_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_QUERY_LEN = 200;
const RESULT_LIMIT = 5;

interface WikiResult {
  title: string;
  description: string;
  url: string;
}

// In-memory cache (per Vercel function instance). Acceptable for MVP
// — popular topics get cached, unpopular ones miss. If we ever want
// distributed cache, swap to Vercel KV.
const cache = new Map<string, { results: WikiResult[]; expiresAt: number }>();

function getCached(key: string): WikiResult[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.results;
}

function setCached(key: string, results: WikiResult[]) {
  cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
  // Bound the cache so we don't leak memory if the function instance
  // is long-lived. ~500 entries * 5 results ≈ a few KB.
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const rawQ = req.query.q;
  const q = (typeof rawQ === 'string' ? rawQ : '').trim().slice(0, MAX_QUERY_LEN);

  if (!q) {
    return res.status(400).json({ error: 'q parameter is required' });
  }

  const cacheKey = q.toLowerCase();
  const hit = getCached(cacheKey);
  if (hit) {
    return res.status(200).json({ results: hit, cached: true });
  }

  const params = new URLSearchParams({
    action: 'opensearch',
    search: q,
    limit: String(RESULT_LIMIT),
    namespace: '0',
    format: 'json',
  });
  const wikiUrl = `https://en.wikipedia.org/w/api.php?${params}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(wikiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BasecampBot/1.0 (https://basecamp-pink.vercel.app; learning app, contact: support@basecamp-pink.vercel.app)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `Wikipedia search failed (${response.status})`,
      });
    }

    // OpenSearch shape: [query, [titles…], [descriptions…], [urls…]]
    const data = (await response.json()) as [string, string[], string[], string[]];
    const titles = Array.isArray(data[1]) ? data[1] : [];
    const descriptions = Array.isArray(data[2]) ? data[2] : [];
    const urls = Array.isArray(data[3]) ? data[3] : [];

    const results: WikiResult[] = titles.map((title, idx) => ({
      title,
      description: descriptions[idx] ?? '',
      url: urls[idx] ?? '',
    })).filter(r => r.title && r.url);

    setCached(cacheKey, results);

    return res.status(200).json({ results });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Wikipedia search timed out' });
    }
    console.error('wiki-search error:', err);
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Wikipedia search failed',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
