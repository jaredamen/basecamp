import { proxyTTS, InsufficientCreditsError } from './managedProxy';

/** The single product voice. OpenAI's "nova" — natural, warm, conversational. */
export const PRODUCT_VOICE = 'nova';
/** OpenAI's higher-quality TTS model. Set via /api/proxy/tts on the managed
 *  path; we hit the same model directly on the BYOK path. */
export const PRODUCT_TTS_MODEL = 'tts-1-hd';

/** Cap matches /api/proxy/tts; longer input is truncated rather than failed. */
const MAX_TTS_CHARS = 4096;

export { InsufficientCreditsError };

/**
 * Fetch nova-voiced audio for `text`. Routes between two paths:
 *
 * - **Managed** (no `byokOpenAIKey` passed): hits `/api/proxy/tts`. Server uses
 *   the developer's OpenAI key, deducts from the user's credits, returns MP3.
 *   Throws `InsufficientCreditsError` on 402.
 * - **BYOK** (`byokOpenAIKey` passed): hits `https://api.openai.com/v1/audio/speech`
 *   directly with the user's key. The user pays OpenAI, no markup, no credits.
 *
 * Both paths return the same Blob so the caller doesn't care which ran.
 */
export async function fetchVoiceAudio(
  text: string,
  byokOpenAIKey?: string,
): Promise<Blob> {
  const capped = text.slice(0, MAX_TTS_CHARS);

  if (byokOpenAIKey) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${byokOpenAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PRODUCT_TTS_MODEL,
        input: capped,
        voice: PRODUCT_VOICE,
        response_format: 'mp3',
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'OpenAI TTS error');
      // Mirror the proxy's error-message shape so the classifier helpers in
      // useNovaTTS / AudioPlayer can surface a meaningful banner.
      throw new Error(`OpenAI TTS error (${res.status}): ${errText}`);
    }
    return res.blob();
  }

  const { audioBlob } = await proxyTTS({ text: capped, voice: PRODUCT_VOICE });
  return audioBlob;
}
