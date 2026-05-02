import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { AudioBriefing } from '../../types';
import type { Flashcard } from '../../services/aiPrompting';
import { QuizPanel } from './QuizPanel';

interface ListeningBandProps {
  briefing: AudioBriefing;
  cards: Flashcard[];
  parentContent: string;
  sectionIndex: number;
  showScript: boolean;
  setShowScript: (v: boolean) => void;
  voiceError: string | null;
  setVoiceError: (v: string | null) => void;
  isReframing: boolean;
  /** When set, the QuizPanel takes over the band; section text is hidden. */
  pendingCard: Flashcard | null;
  cardRevealed: boolean;
  setCardRevealed: (v: boolean) => void;
  onCardVerdict: (verdict: 'gotIt' | 'reviewAgain') => void;
  onDeepDive?: (selection: string) => void;
  onAnalogyUpdated: (cardId: string, newExplanation: string) => void;
  onReframeAudio?: () => void;
  /** Toggle to switch from listening to study cards. The Audio/Study Cards
   *  pair lives outside the band (next to the orb), but the band needs the
   *  callback for the back arrow / "go to cards" affordance. */
  onSwitchToCards: () => void;
  onBack: () => void;
  /** Pop a recursive dive when the user is inside one. */
  isInDive: boolean;
  onExitDive: () => void;
}

/**
 * The listening view content — section text + secondary controls. Replaces
 * the old AudioPlayer's main area now that the orb (with the play button)
 * lives at App level.
 *
 * When a checkpoint hits (`pendingCard` set), the band swaps to a QuizPanel.
 * The orb beside the band shifts to its `Quiz` (ember) state.
 */
export function ListeningBand({
  briefing,
  cards: _cards,
  parentContent,
  sectionIndex,
  showScript,
  setShowScript,
  voiceError,
  setVoiceError,
  isReframing,
  pendingCard,
  cardRevealed,
  setCardRevealed,
  onCardVerdict,
  onDeepDive,
  onAnalogyUpdated,
  onReframeAudio,
  onBack,
  isInDive,
  onExitDive,
}: ListeningBandProps) {
  const sections = briefing.sections;
  const hasSections = !!(sections && sections.length > 0);
  const currentSection = hasSections ? sections[Math.min(sectionIndex, sections.length - 1)] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4"
    >
      {/* Top row — back, dive-exit, secondary controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isInDive && (
            <button
              onClick={onExitDive}
              className="text-xs px-3 py-1.5 rounded-full bg-solar-ember/15 border border-solar-ember/40 text-solar-ember hover:bg-solar-ember/25 transition-colors font-mono"
              aria-label="Back to parent briefing"
            >
              ← back to parent
            </button>
          )}
          <button
            onClick={onBack}
            className="text-xs text-solar-gold hover:text-solar-amber transition-colors font-mono"
          >
            ← back
          </button>
        </div>
        <div className="flex items-center gap-2">
          {onReframeAudio && (
            <button
              onClick={onReframeAudio}
              disabled={isReframing}
              title="Re-frame this lesson with a different analogy"
              className="text-xs text-solar-gold hover:text-solar-amber disabled:text-solar-500 disabled:cursor-not-allowed px-2.5 py-1 rounded border border-solar-gold/40 hover:border-solar-gold/60 disabled:border-solar-700 hover:bg-solar-gold/10 disabled:hover:bg-transparent transition-colors flex items-center gap-1 font-mono"
            >
              <span>💡</span>
              <span>{isReframing ? 're-framing…' : 'different analogy'}</span>
            </button>
          )}
          <button
            onClick={() => setShowScript(!showScript)}
            className="text-xs text-solar-500 hover:text-solar-100 px-2 py-1 rounded border border-solar-gold/15 hover:border-solar-gold/30 font-mono"
          >
            {showScript ? 'hide script' : 'show script'}
          </button>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-solar-100">{briefing.title}</h2>

      {/* Voice fallback notice */}
      {voiceError && (
        <div className="bg-solar-ember/15 border border-solar-ember/30 text-solar-ember text-sm px-4 py-3 rounded-lg flex items-center justify-between gap-4">
          <span className="flex-1">{voiceError}</span>
          <button
            onClick={() => setVoiceError(null)}
            className="text-solar-ember hover:text-solar-100 text-xs underline-offset-2 hover:underline"
            aria-label="Dismiss voice notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* In-place reframe banner */}
      {isReframing && (
        <div className="bg-solar-gold/10 border border-solar-gold/30 text-solar-gold text-sm px-4 py-3 rounded-lg flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span className="flex-1 font-mono">🎵 re-framing this lesson with a fresh analogy…</span>
        </div>
      )}

      {/* Body — quiz panel takes over when a checkpoint hits, else section
          text on a glass panel. */}
      {pendingCard ? (
        <QuizPanel
          card={pendingCard}
          revealed={cardRevealed}
          parentContent={parentContent}
          onReveal={() => setCardRevealed(true)}
          onVerdict={onCardVerdict}
          onDeepDive={onDeepDive}
          onAnalogyUpdated={onAnalogyUpdated}
        />
      ) : showScript ? (
        <div className="glass rounded-xl p-6 max-h-[60vh] overflow-auto">
          <div className="whitespace-pre-wrap text-solar-100/85 leading-relaxed text-sm">
            {briefing.script}
          </div>
        </div>
      ) : currentSection ? (
        <motion.div
          key={currentSection.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="glass rounded-xl p-6"
        >
          {currentSection.heading && (
            <div className="text-xs text-solar-gold font-mono uppercase tracking-wider mb-3">
              {currentSection.heading}
            </div>
          )}
          <p className="text-solar-100 leading-relaxed">{currentSection.content}</p>
        </motion.div>
      ) : (
        <div className="glass rounded-xl p-6">
          <p className="text-solar-400 text-sm">No sections to play.</p>
        </div>
      )}
    </motion.div>
  );
}
