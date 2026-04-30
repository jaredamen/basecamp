import { useCallback } from 'react';
import { AIPromptingService, type Flashcard } from '../services/aiPrompting';
import { proxyChat } from '../services/managedProxy';
import { useBYOK } from './useBYOK';

/**
 * Two LLM-backed actions on a single flashcard, both routed through the
 * same managed-vs-BYOK split as the rest of the app:
 *   - gradeAnswer: type-the-answer mode. Student types what they think,
 *     we call the LLM to grade it semantically (correct / close / wrong).
 *   - regenerateAnalogy: "give me a different parable for this concept"
 *     button. Returns just a fresh analogy string for the explanation field.
 *
 * Both are stateless — the caller manages loading state on its own. Both
 * use the same governance + max_tokens guardrails as the proxy chat
 * endpoint (compliance unchanged).
 */
export function useFlashcardAI() {
  const { config, isManaged } = useBYOK();
  const aiService = AIPromptingService.getInstance();

  const callAI = useCallback(async (prompt: string, maxTokens: number): Promise<string> => {
    if (isManaged) {
      const { result } = await proxyChat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });
      return result.choices[0].message.content;
    }
    if (!config?.aiProvider) {
      throw new Error('AI provider not configured');
    }
    // BYOK direct path. Reuses the same callAIProvider logic via a small
    // wrapper that AIPromptingService exposes via the chat methods. We
    // re-emit the prompt directly through fetch since the existing public
    // surface is generation-shaped, not free-form-shaped.
    const provider = config.aiProvider;
    const baseURL = provider.baseURL || 'https://api.openai.com/v1';
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`OpenAI error (${response.status}): ${err}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  }, [isManaged, config]);

  const gradeAnswer = useCallback(async (
    card: Flashcard,
    studentAnswer: string,
  ): Promise<{ verdict: 'correct' | 'close' | 'wrong'; feedback: string }> => {
    const prompt = aiService.getGradingPrompt(card, studentAnswer);
    const json = await callAI(prompt, 200);
    return aiService.parseGradingResponse(json);
  }, [aiService, callAI]);

  const regenerateAnalogy = useCallback(async (
    card: Flashcard,
    parentContext: string,
  ): Promise<string> => {
    const prompt = aiService.getAnalogyRefreshPrompt(card, parentContext);
    const json = await callAI(prompt, 400);
    return aiService.parseAnalogyResponse(json);
  }, [aiService, callAI]);

  return { gradeAnswer, regenerateAnalogy };
}
