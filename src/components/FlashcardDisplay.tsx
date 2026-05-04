import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { FlashcardSet } from '../services/aiPrompting';
import { useFlashcardAI } from '../hooks/useFlashcardAI';
import { briefingLibrary } from '../services/briefingLibrary';
import { FEATURES } from '../config/features';

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
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-solar-100">{flashcardSet.title}</h1>
          <p className="text-solar-400">{flashcardSet.description}</p>

          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-solar-500 font-mono mb-2">
              <span>Card {currentIndex + 1} of {flashcardSet.cards.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <div className="w-full bg-solar-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-solar-gold to-solar-amber h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="glass rounded-xl p-8 min-h-[420px]">
          {!isFlipped ? (
            // ── Front: question + optional type-the-answer input ─────────
            <div className="flex flex-col justify-between h-full min-h-[360px] gap-6">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-solar-gold font-semibold">Question</div>
                <p className="text-xl font-medium text-solar-100 leading-relaxed">{currentCard.front}</p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm text-solar-400">
                  Try to recall the answer (optional — typing forces active recall):
                </label>
                <textarea
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="Type what you think the answer is, then click Check…"
                  rows={3}
                  className="w-full px-4 py-3 bg-solar-900/60 border border-solar-gold/20 rounded-lg text-solar-100 text-sm focus:border-solar-gold focus:ring-1 focus:ring-solar-gold outline-none resize-y"
                  disabled={grading}
                />

                {verdict && (
                  <div className={`rounded-lg border px-4 py-3 ${VERDICT_STYLE[verdict.verdict].bg}`}>
                    <div className={`text-sm font-semibold ${VERDICT_STYLE[verdict.verdict].text}`}>
                      {VERDICT_STYLE[verdict.verdict].label}
                    </div>
                    <p className="text-sm text-solar-100/85 mt-1">{verdict.feedback}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCheckAnswer}
                    disabled={!studentAnswer.trim() || grading}
                    className="flex-1 px-5 py-2.5 bg-solar-gold hover:bg-solar-amber disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed text-solar-900 rounded-lg font-medium transition-colors"
                  >
                    {grading ? 'Checking…' : 'Check my answer'}
                  </button>
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="px-5 py-2.5 bg-solar-700 hover:bg-solar-600 text-solar-100 rounded-lg font-medium transition-colors"
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
                <p className="mt-2 text-lg text-solar-100 leading-relaxed">{currentCard.back}</p>
              </div>

              {currentCard.explanation && (
                <div className="bg-solar-gold/10 border border-solar-gold/25 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-solar-gold">Remember it like this</h4>
                  <p className="text-solar-100/85 text-sm leading-relaxed">{currentCard.explanation}</p>
                  {analogyError && <p className="text-xs text-solar-ember">{analogyError}</p>}
                </div>
              )}

              {/* Analogy refresh — only when the user didn't nail it.
                  Hidden when verdict === 'correct' (no need for a fresh
                  parable when they got the answer right). Visible when they
                  got it wrong/close, OR when they skipped recall entirely. */}
              {currentCard.explanation && verdict?.verdict !== 'correct' && (
                <button
                  onClick={handleRefreshAnalogy}
                  disabled={refreshingAnalogy}
                  className="w-full px-4 py-3 rounded-xl bg-solar-gold/15 border border-solar-gold/40 text-solar-gold hover:bg-solar-gold/25 disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {refreshingAnalogy ? (
                    <>
                      <Loader2 className="inline-block w-4 h-4 animate-spin" />
                      Generating a fresh parable…
                    </>
                  ) : (
                    <>
                      <span>💡</span>
                      <span>This analogy didn't land — try a different one</span>
                    </>
                  )}
                </button>
              )}

              {/* Tokenized dive: pick a specific named concept to drill into,
                  rather than diving on the whole card. Hidden in the SLC
                  launch (study mode itself is hidden via the toggle); v2
                  re-enables. */}
              {FEATURES.showDive && (
                <div className="space-y-2">
                  <div className="text-xs text-solar-500">🤿 Dive deeper into:</div>
                  <div className="flex flex-wrap gap-2">
                    {(currentCard.keyTerms && currentCard.keyTerms.length > 0
                      ? currentCard.keyTerms
                      : [currentCard.front]
                    ).map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => onDeepDive(term)}
                        className="text-xs px-3 py-1.5 rounded-full bg-solar-amber/15 border border-solar-amber/40 text-solar-amber hover:bg-solar-amber/25 hover:border-solar-amber/60 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation + verdict-driven advance */}
        <div className="flex justify-between items-center gap-3">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
            className="px-5 py-2 bg-solar-700 text-solar-100 rounded-lg hover:bg-solar-600 disabled:bg-solar-800 disabled:text-solar-500 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>

          {isFlipped ? (
            <div className="flex gap-2 flex-1 justify-center">
              <button
                onClick={() => advance('reviewAgain')}
                className="px-5 py-2 bg-solar-ember/20 border border-solar-ember/40 text-solar-ember hover:bg-solar-ember/30 rounded-lg font-medium transition-colors"
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
              className="flex-1 max-w-[160px] px-5 py-2 bg-solar-gold hover:bg-solar-amber text-solar-900 rounded-lg font-medium transition-colors"
            >
              Show answer
            </button>
          )}

          <button
            onClick={() => setCurrentIndex(prev => Math.min(prev + 1, flashcardSet.cards.length - 1))}
            disabled={isLastCard}
            className="px-5 py-2 bg-solar-700 text-solar-100 rounded-lg hover:bg-solar-600 disabled:bg-solar-800 disabled:text-solar-500 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
