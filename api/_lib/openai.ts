import { config } from './config';

const OPENAI_BASE = 'https://api.openai.com/v1';

function headers() {
  return {
    Authorization: `Bearer ${config.openai.apiKey}`,
    'Content-Type': 'application/json',
  };
}

// Call OpenAI Chat Completions
export async function chatCompletion(body: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}) {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: config.openai.defaultModel,
      ...body,
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
export async function textToSpeech(body: {
  text: string;
  voice?: string;
  speed?: number;
}): Promise<ArrayBuffer> {
  const res = await fetch(`${OPENAI_BASE}/audio/speech`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: config.openai.ttsModel,
      input: body.text,
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
