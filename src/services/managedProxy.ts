// Client-side helpers for calling the managed proxy endpoints.

export class InsufficientCreditsError extends Error {
  balance: number;
  constructor(balance: number) {
    super('Insufficient credits');
    this.name = 'InsufficientCreditsError';
    this.balance = balance;
  }
}

// Helper to extract remaining credits from response headers
function getCreditsRemaining(res: Response): number | undefined {
  const header = res.headers.get('X-Credits-Remaining');
  return header ? parseInt(header, 10) : undefined;
}

// Proxied OpenAI chat completion
export async function proxyChat(body: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}): Promise<{ result: any; creditsRemaining?: number }> {
  const res = await fetch('/api/proxy/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (res.status === 402) {
    const data = await res.json();
    throw new InsufficientCreditsError(data.balance);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.message || data.error || `Proxy error: ${res.status}`);
  }

  const result = await res.json();
  return { result, creditsRemaining: getCreditsRemaining(res) };
}

// Proxied OpenAI TTS — returns audio as a Blob
export async function proxyTTS(body: {
  text: string;
  voice?: string;
  speed?: number;
}): Promise<{ audioBlob: Blob; creditsRemaining?: number }> {
  const res = await fetch('/api/proxy/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (res.status === 402) {
    const data = await res.json();
    throw new InsufficientCreditsError(data.balance);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.message || data.error || `Proxy error: ${res.status}`);
  }

  const audioBlob = await res.blob();
  return { audioBlob, creditsRemaining: getCreditsRemaining(res) };
}
