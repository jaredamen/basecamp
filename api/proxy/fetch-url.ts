import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth.js';

// POST /api/proxy/fetch-url — server-side URL fetcher
// Client-side fetch is blocked by CORS on most sites (Wikipedia, etc).
// This endpoint fetches the URL server-side and returns cleaned text.
// Body: { url: string }

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB cap to prevent abuse

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  // Validate URL: only http/https, no internal addresses
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only HTTP(S) URLs are supported' });
  }

  // Block localhost / private IPs to prevent SSRF
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.16.') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BasecampBot/1.0; +https://basecamp-pink.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `Failed to fetch URL (${response.status} ${response.statusText})`,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('xml')) {
      return res.status(400).json({
        error: `Unsupported content type: ${contentType}. Only HTML/text URLs are supported.`,
      });
    }

    // Read with byte cap to prevent memory abuse
    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(502).json({ error: 'No response body' });
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      if (totalBytes > MAX_BYTES) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder();
    const html = chunks.map((c) => decoder.decode(c, { stream: true })).join('');

    // Strip HTML tags, scripts, and styles
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (textContent.length < 100) {
      return res.status(400).json({
        error: 'Unable to extract meaningful content from URL',
      });
    }

    // Cap returned content at 20,000 chars (roughly 5k tokens) to keep AI costs reasonable.
    // Wikipedia articles can be 100k+ chars — we only need the first ~20k for good flashcards.
    const capped = textContent.slice(0, 20_000);

    return res.status(200).json({ content: capped });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return res.status(504).json({ error: 'URL fetch timed out' });
    }
    console.error('fetch-url error:', err);
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to fetch URL',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
