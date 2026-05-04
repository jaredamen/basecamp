import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { Flashcard } from '../../services/aiPrompting';
import { useFlashcardAI } from '../../hooks/useFlashcardAI';
import { FEATURES } from '../../config/features';

interface QuizPanelProps {
  card: Flashcard;
  revealed: boolean;
  parentContent: string;
  onReveal: () => void;
  onVerdict: (verdict: 'gotIt' | 'reviewAgain') => void;
  /** Triggered with the user-picked keyTerm. The caller wraps this to
   *  attach the current sectionIndex so the resume mechanism can land
   *  the user back at the right spot when popping the dive. */
  onDeepDive?: (selection: string) => void;
  onAnalogyUpdated?: (cardId: string, newExplanation: string) => void;
}

/**
 * Mid-listen recall checkpoint. Same mechanic as the old FlashcardOverlay
 * (extracted from AudioPlayer) but rendered as a glass panel that lives
 * inside the ContextBand — it doesn't take over the whole screen, just
 * temporarily replaces the ListeningBand's section text. The orb stays
 * visible at the side, in `Quiz` (ember) state.
 */
export function QuizPanel({
  card,
  revealed,
  parentContent,
  onReveal,
  onVerdict,
  onDeepDive,
  onAnalogyUpdated,
}: QuizPanelProps) {
  const { gradeAnswer, regenerateAnalogy } = useFlashcardAI();
  const hasMCQ = !!(card.choices && card.choices.length === 4 && typeof card.correctIndex === 'number');

  const [mode, setMode] = useState<'mcq' | 'type'>(hasMCQ ? 'mcq' : 'type');
  const [mcqSelection, setMcqSelection] = useState<number | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [grading, setGrading] = useState(false);
  const [verdict, setVerdict] = useState<{ verdict: 'correct' | 'close' | 'wrong'; feedback: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [analogyError, setAnalogyError] = useState<string | null>(null);

  const handleMCQTap = (idx: number) => {
    if (mcqSelection !== null || !hasMCQ) return;
    setMcqSelection(idx);
    const isCorrect = idx === card.correctIndex;
    setVerdict({
      verdict: isCorrect ? 'correct' : 'wrong',
      feedback: isCorrect
        ? 'Right.'
        : `Not quite — the correct answer was ${String.fromCharCode(65 + (card.correctIndex ?? 0))}.`,
    });
    window.setTimeout(onReveal, isCorrect ? 700 : 1500);
  };

  const handleCheck = async () => {
    if (!studentAnswer.trim() || grading) return;
    setGrading(true);
    try {
      const result = await gradeAnswer(card, studentAnswer);
      setVerdict(result);
      window.setTimeout(onReveal, 600);
    } catch (err) {
      setVerdict({
        verdict: 'close',
        feedback: err instanceof Error ? `Couldn't grade: ${err.message}` : 'Reveal to compare.',
      });
      onReveal();
    } finally {
      setGrading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing || !onAnalogyUpdated) return;
    setRefreshing(true);
    setAnalogyError(null);
    try {
      const fresh = await regenerateAnalogy(card, parentContent);
      onAnalogyUpdated(card.id, fresh);
    } catch (err) {
      setAnalogyError(err instanceof Error ? err.message : 'Could not refresh analogy.');
    } finally {
      setRefreshing(false);
    }
  };

  const verdictBadge =
    verdict?.verdict === 'correct'
      ? { bg: 'bg-green-500/15 border-green-400/40', text: 'text-green-300', label: '✓ Correct' }
      : verdict?.verdict === 'close'
        ? { bg: 'bg-yellow-500/15 border-yellow-400/40', text: 'text-yellow-300', label: '~ Close' }
        : verdict?.verdict === 'wrong'
          ? { bg: 'bg-solar-ember/15 border-solar-ember/40', text: 'text-solar-ember', label: '✗ Not quite' }
          : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className="glass-strong rounded-2xl p-4 sm:p-6 relative overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Active recall flashcard"
    >
      {/* Glass-shard accent — angled gold line catching the eye toward the
          choices below the question. JARVIS holographic touch. */}
      <div className="absolute inset-x-0 top-[42%] h-px bg-gradient-to-r from-transparent via-solar-gold/30 to-transparent transform -skew-y-1 pointer-events-none" />

      <div className="flex items-center gap-2 text-solar-gold text-xs font-mono font-semibold uppercase tracking-wider mb-3">
        <span className="inline-block w-2 h-2 rounded-full bg-solar-gold animate-pulse" />
        {revealed ? 'Answer' : 'Recall'}
      </div>

      <p className="text-lg font-semibold text-solar-100 leading-snug mb-5">{card.front}</p>

      {!revealed ? (
        mode === 'mcq' && hasMCQ && card.choices ? (
          <div className="space-y-2">
            {card.choices.map((choice, idx) => {
              const isPicked = mcqSelection === idx;
              const isCorrectKey = idx === card.correctIndex;
              const answered = mcqSelection !== null;
              let cls = 'border-solar-gold/15 bg-solar-700 text-solar-100 hover:border-solar-gold/40 hover:bg-solar-gold/10';
              if (answered) {
                if (isCorrectKey) cls = 'border-green-400/60 bg-green-500/15 text-solar-100';
                else if (isPicked) cls = 'border-solar-ember/60 bg-solar-ember/15 text-solar-100';
                else cls = 'border-solar-gold/10 bg-solar-700/50 text-solar-500 opacity-60';
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleMCQTap(idx)}
                  disabled={answered}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm flex items-center gap-3 transition-all ${cls}`}
                >
                  <span className="w-7 h-7 rounded-lg bg-solar-600 text-solar-100 font-bold font-mono text-xs flex items-center justify-center flex-shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{choice}</span>
                  {answered && isCorrectKey && <span className="text-green-400 font-bold">✓</span>}
                  {answered && isPicked && !isCorrectKey && <span className="text-solar-ember font-bold">✗</span>}
                </button>
              );
            })}
            {mcqSelection === null && (
              <button
                onClick={() => setMode('type')}
                className="w-full text-center text-xs text-solar-gold hover:text-solar-amber underline-offset-2 hover:underline pt-1"
              >
                Or type your full answer
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Type what you think the answer is (optional)…"
              rows={2}
              className="w-full px-3 py-2 bg-solar-900/60 border border-solar-gold/20 rounded-lg text-solar-100 text-sm focus:border-solar-gold focus:ring-1 focus:ring-solar-gold outline-none resize-y"
              disabled={grading}
            />
            {verdictBadge && verdict && (
              <div className={`rounded-lg border px-3 py-2 ${verdictBadge.bg}`}>
                <div className={`text-xs font-semibold ${verdictBadge.text}`}>{verdictBadge.label}</div>
                <p className="text-xs text-solar-100/85 mt-0.5">{verdict.feedback}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCheck}
                disabled={!studentAnswer.trim() || grading}
                className="flex-1 py-2.5 rounded-xl bg-solar-gold hover:bg-solar-amber disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed text-solar-900 font-semibold transition-colors"
              >
                {grading ? 'Checking…' : 'Check my answer'}
              </button>
              <button
                onClick={onReveal}
                className="px-4 py-2.5 rounded-xl bg-solar-700 hover:bg-solar-600 text-solar-100 font-medium transition-colors"
              >
                Show
              </button>
            </div>
            {hasMCQ && (
              <button
                onClick={() => setMode('mcq')}
                className="w-full text-center text-xs text-solar-gold hover:text-solar-amber underline-offset-2 hover:underline"
              >
                Or pick from multiple choice
              </button>
            )}
          </div>
        )
      ) : (
        <>
          <div className="rounded-xl bg-solar-700/60 border border-solar-gold/15 p-4 space-y-3">
            <p className="text-base text-solar-100 leading-relaxed">{card.back}</p>
            {card.explanation && (
              <div className="pt-3 border-t border-solar-gold/15">
                <p className="text-sm text-solar-400 italic leading-relaxed">{card.explanation}</p>
                {analogyError && <p className="text-xs text-solar-ember mt-2">{analogyError}</p>}
              </div>
            )}
          </div>

          {card.explanation && onAnalogyUpdated && verdict?.verdict !== 'correct' && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full mt-4 px-4 py-3 rounded-xl bg-solar-gold/15 border border-solar-gold/40 text-solar-gold hover:bg-solar-gold/25 disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
            >
              {refreshing ? (
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

          {FEATURES.showDive && onDeepDive && (
            <div className="mt-4 space-y-2">
              <div className="text-xs text-solar-500 font-mono">🤿 dive deeper into:</div>
              <div className="flex flex-wrap gap-2">
                {(card.keyTerms && card.keyTerms.length > 0
                  ? card.keyTerms
                  : [card.front]
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

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => onVerdict('reviewAgain')}
              className="flex-1 py-3 rounded-xl bg-solar-ember/20 border border-solar-ember/40 text-solar-ember hover:bg-solar-ember/30 font-semibold transition-colors"
            >
              👎 Review again
            </button>
            <button
              onClick={() => onVerdict('gotIt')}
              className="flex-1 py-3 rounded-xl bg-green-600/20 border border-green-600/40 text-green-300 hover:bg-green-600/30 font-semibold transition-colors"
            >
              👍 Got it
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
