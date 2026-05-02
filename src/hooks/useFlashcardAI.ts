import { useCallback } from 'react';
import { AIPromptingService, type Flashcard } from '../services/aiPrompting';
import { proxyChat } from '../services/managedProxy';

/**
 * Two LLM-backed actions on a single flashcard, both routed through the
 * managed proxy:
 *   - gradeAnswer: type-the-answer mode. Student types what they think,
 *     we call the LLM to grade it semantically (correct / close / wrong).
 *   - regenerateAnalogy: "give me a different parable for this concept"
 *     button. Returns just a fresh analogy string for the explanation field.
 *
 * Both are stateless — the caller manages loading state on its own. Both
 * use the same governance + max_tokens guardrails as the proxy chat
 * endpoint.
 */
export function useFlashcardAI() {
  const aiService = AIPromptingService.getInstance();

  const callAI = useCallback(async (prompt: string, maxTokens: number): Promise<string> => {
    const { result } = await proxyChat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });
    return result.choices[0].message.content;
  }, []);

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
