import { config } from './config.js';
import { GOVERNANCE_SYSTEM_PROMPT, MAX_TOKENS } from './governancePrompt.js';

const OPENAI_BASE = 'https://api.openai.com/v1';
const LLM_TIMEOUT_MS = 60_000; // 60 second hard timeout

function headers() {
  return {
    Authorization: `Bearer ${config.openai.apiKey}`,
    'Content-Type': 'application/json',
  };
}

// fetchWithTimeout — aborts after LLM_TIMEOUT_MS to prevent hung requests
// draining cost. Throws a TimeoutError on abort.
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`LLM request timed out after ${LLM_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Call OpenAI Chat Completions.
// Prepends governance system prompt and enforces MAX_TOKENS server-side ceiling.
export async function chatCompletion(body: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}) {
  // Enforce server-side max_tokens ceiling — never trust client input
  const requestedMax = body.max_tokens ?? 2000;
  const enforcedMax = Math.min(requestedMax, MAX_TOKENS);

  // Prepend governance system prompt to every call
  const messagesWithGovernance = [
    { role: 'system', content: GOVERNANCE_SYSTEM_PROMPT },
    ...body.messages,
  ];

  const res = await fetchWithTimeout(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: config.openai.defaultModel,
      ...body,
      messages: messagesWithGovernance,
      max_tokens: enforcedMax,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${error}`);
  }

  return res.json();
}

// Call OpenAI Text-to-Speech
// Returns the audio as an ArrayBuffer (MP3).
// Enforces 60s timeout and caps input length to prevent cost runaway.
export async function textToSpeech(body: {
  text: string;
  voice?: string;
  speed?: number;
}): Promise<ArrayBuffer> {
  // Cap TTS input length — OpenAI max is 4096 chars, we cap further for cost safety
  const MAX_TTS_CHARS = 4000;
  const cappedText = body.text.slice(0, MAX_TTS_CHARS);

  const res = await fetchWithTimeout(`${OPENAI_BASE}/audio/speech`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: config.openai.ttsModel,
      input: cappedText,
      voice: body.voice || config.openai.ttsDefaultVoice,
      speed: body.speed || 1.0,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI TTS error (${res.status}): ${error}`);
  }

  return res.arrayBuffer();
}
