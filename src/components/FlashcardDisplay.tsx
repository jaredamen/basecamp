import { useEffect, useState } from 'react';
import type { FlashcardSet } from '../services/aiPrompting';
import { useFlashcardAI } from '../hooks/useFlashcardAI';
import { briefingLibrary } from '../services/briefingLibrary';

interface FlashcardDisplayProps {
  flashcardSet: FlashcardSet;
  /** ID under which review history accumulates. Use the FlashcardSet's id
   *  (also the briefing's id in the library) so reviews here line up with
   *  reviews from the audio interrupts. */
  briefingId: string;
  /** Source text the deck was built from, used as parent context when
   *  grading or regenerating analogies. Empty string is fine. */
  parentContent: string;
  /** Trigger a recursive dive on a topic. Caller routes this to
   *  useContentGeneration.deepDive(selection). */
  onDeepDive: (selection: string) => void;
  /** Replace one card's analogy in the parent state — caller handles the
   *  regeneration call and hands us the new explanation text. */
  onAnalogyUpdated: (cardId: string, newExplanation: string) => void;
  onComplete?: () => void;
}

type Verdict = 'correct' | 'close' | 'wrong';

const VERDICT_STYLE: Record<Verdict, { bg: string; text: string; label: string }> = {
  correct: { bg: 'bg-green-500/15 border-green-400/40', text: 'text-green-300', label: '✓ Correct' },
  close: { bg: 'bg-yellow-500/15 border-yellow-400/40', text: 'text-yellow-300', label: '~ Close' },
  wrong: { bg: 'bg-orange-500/15 border-orange-400/40', text: 'text-orange-300', label: '✗ Not quite' },
};

export function FlashcardDisplay({
  flashcardSet,
  briefingId,
  parentContent,
  onDeepDive,
  onAnalogyUpdated,
  onComplete,
}: FlashcardDisplayProps) {
  const { gradeAnswer, regenerateAnalogy } = useFlashcardAI();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [grading, setGrading] = useState(false);
  const [verdict, setVerdict] = useState<{ verdict: Verdict; feedback: string } | null>(null);
  const [refreshingAnalogy, setRefreshingAnalogy] = useState(false);
  const [analogyError, setAnalogyError] = useState<string | null>(null);

  const currentCard = flashcardSet.cards[currentIndex];
  const isLastCard = currentIndex === flashcardSet.cards.length - 1;
  const progress = ((currentIndex + 1) / flashcardSet.cards.length) * 100;

  // Reset per-card UI when the index changes.
  useEffect(() => {
    setIsFlipped(false);
    setStudentAnswer('');
    setVerdict(null);
    setAnalogyError(null);
  }, [currentIndex]);

  const advance = (recordVerdict?: 'gotIt' | 'reviewAgain') => {
    if (recordVerdict) {
      briefingLibrary.recordCardReview(briefingId, currentCard.id, recordVerdict);
    }
    if (isLastCard && onComplete) {
      onComplete();
      return;
    }
    setCurrentIndex(prev => Math.min(prev + 1, flashcardSet.cards.length - 1));
  };

  const handleCheckAnswer = async () => {
    if (!studentAnswer.trim() || grading) return;
    setGrading(true);
    try {
      const result = await gradeAnswer(currentCard, studentAnswer);
      setVerdict(result);
      // Auto-flip after a moment so the canonical answer is visible to compare.
      window.setTimeout(() => setIsFlipped(true), 600);
    } catch (err) {
      setVerdict({
        verdict: 'close',
        feedback: err instanceof Error ? `Couldn't grade: ${err.message}` : 'Reveal the answer to compare.',
      });
      setIsFlipped(true);
    } finally {
      setGrading(false);
    }
  };

  const handleRefreshAnalogy = async () => {
    if (refreshingAnalogy) return;
    setRefreshingAnalogy(true);
    setAnalogyError(null);
    try {
      const fresh = await regenerateAnalogy(currentCard, parentContent);
      onAnalogyUpdated(currentCard.id, fresh);
    } catch (err) {
      setAnalogyError(err instanceof Error ? err.message : 'Could not generate a new analogy. Try again.');
    } finally {
      setRefreshingAnalogy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">{flashcardSet.title}</h1>
          <p className="text-dark-300">{flashcardSet.description}</p>

          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-dark-400 mb-2">
              <span>Card {currentIndex + 1} of {flashcardSet.cards.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-8 min-h-[420px]">
          {!isFlipped ? (
            // ── Front: question + optional type-the-answer input ─────────
            <div className="flex flex-col justify-between h-full min-h-[360px] gap-6">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-blue-400 font-semibold">Question</div>
                <p className="text-xl font-medium text-white leading-relaxed">{currentCard.front}</p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm text-dark-300">
                  Try to recall the answer (optional — typing forces active recall):
                </label>
                <textarea
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="Type what you think the answer is, then click Check…"
                  rows={3}
                  className="w-full px-4 py-3 bg-dark-900/60 border border-dark-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
                  disabled={grading}
                />

                {verdict && (
                  <div className={`rounded-lg border px-4 py-3 ${VERDICT_STYLE[verdict.verdict].bg}`}>
                    <div className={`text-sm font-semibold ${VERDICT_STYLE[verdict.verdict].text}`}>
                      {VERDICT_STYLE[verdict.verdict].label}
                    </div>
                    <p className="text-sm text-dark-200 mt-1">{verdict.feedback}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCheckAnswer}
                    disabled={!studentAnswer.trim() || grading}
                    className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-dark-700 disabled:text-dark-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {grading ? 'Checking…' : 'Check my answer'}
                  </button>
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="px-5 py-2.5 bg-dark-700 hover:bg-dark-600 text-dark-100 rounded-lg font-medium transition-colors"
                  >
                    Show answer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // ── Back: factual answer + analogy + actions ─────────────────
            <div className="space-y-5">
              <div>
                <div className="text-xs uppercase tracking-wider text-green-400 font-semibold">Answer</div>
                <p className="mt-2 text-lg text-white leading-relaxed">{currentCard.back}</p>
              </div>

              {currentCard.explanation && (
                <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-blue-300">Remember it like this</h4>
                    <button
                      onClick={handleRefreshAnalogy}
                      disabled={refreshingAnalogy}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:text-dark-500 disabled:cursor-not-allowed underline-offset-2 hover:underline"
                    >
                      {refreshingAnalogy ? 'Generating…' : 'Try a different analogy'}
                    </button>
                  </div>
                  <p className="text-dark-200 text-sm leading-relaxed">{currentCard.explanation}</p>
                  {analogyError && <p className="text-xs text-orange-400">{analogyError}</p>}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => onDeepDive(currentCard.front)}
                  className="text-xs text-purple-400 hover:text-purple-300 underline-offset-2 hover:underline"
                >
                  🤿 Dive deeper into this
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation + verdict-driven advance */}
        <div className="flex justify-between items-center gap-3">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
            className="px-5 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 disabled:bg-dark-800 disabled:text-dark-500 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>

          {isFlipped ? (
            <div className="flex gap-2 flex-1 justify-center">
              <button
                onClick={() => advance('reviewAgain')}
                className="px-5 py-2 bg-orange-600/20 border border-orange-600/40 text-orange-300 hover:bg-orange-600/30 rounded-lg font-medium transition-colors"
              >
                👎 Review again
              </button>
              <button
                onClick={() => advance('gotIt')}
                className="px-5 py-2 bg-green-600/20 border border-green-600/40 text-green-300 hover:bg-green-600/30 rounded-lg font-medium transition-colors"
              >
                👍 Got it
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="flex-1 max-w-[160px] px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Show answer
            </button>
          )}

          <button
            onClick={() => setCurrentIndex(prev => Math.min(prev + 1, flashcardSet.cards.length - 1))}
            disabled={isLastCard}
            className="px-5 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 disabled:bg-dark-800 disabled:text-dark-500 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
