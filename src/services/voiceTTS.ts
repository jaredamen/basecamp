import { proxyTTS, InsufficientCreditsError } from './managedProxy';

/** The single product voice. OpenAI's "nova" — natural, warm, conversational. */
export const PRODUCT_VOICE = 'nova';
/** OpenAI's higher-quality TTS model — set server-side in `/api/proxy/tts`. */
export const PRODUCT_TTS_MODEL = 'tts-1-hd';

/** Cap matches /api/proxy/tts; longer input is truncated rather than failed. */
const MAX_TTS_CHARS = 4096;

export { InsufficientCreditsError };

/**
 * Fetch nova-voiced audio for `text`. All requests route through the
 * managed proxy at `/api/proxy/tts` (the server uses the developer's
 * OpenAI key, deducts from the user's credits, returns MP3).
 *
 * Throws `InsufficientCreditsError` on 402.
 */
export async function fetchVoiceAudio(text: string): Promise<Blob> {
  const capped = text.slice(0, MAX_TTS_CHARS);
  const { audioBlob } = await proxyTTS({ text: capped, voice: PRODUCT_VOICE });
  return audioBlob;
}
