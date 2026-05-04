import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FlashcardSet, AudioScript } from '../../services/aiPrompting';
import type { Flashcard } from '../../services/aiPrompting';
import type { AudioBriefing } from '../../types';
import { FEATURES } from '../../config/features';
import { ListeningBand } from './ListeningBand';
import { StudyingBand } from './StudyingBand';

type ViewMode = 'audio' | 'flashcards';

interface ContentBandProps {
  flashcards: FlashcardSet;
  audioScript: AudioScript;
  originalContent: string;
  isInDive: boolean;
  isReframing: boolean;

  // Audio playback state (lifted to App via useAudioPlayback)
  sectionIndex: number;
  showScript: boolean;
  setShowScript: (v: boolean) => void;
  voiceError: string | null;
  setVoiceError: (v: string | null) => void;
  pendingCard: Flashcard | null;
  cardRevealed: boolean;
  setCardRevealed: (v: boolean) => void;
  onCardVerdict: (verdict: 'gotIt' | 'reviewAgain') => void;

  // Callbacks
  onDeepDive: (selection: string, currentSectionIndex?: number) => void;
  onExitDive: () => void;
  onAnalogyUpdated: (cardId: string, newExplanation: string) => void;
  onReframeAudio: () => void;
  onBack: () => void;
}

/**
 * Content band — Audio (listening) ↔ Study Cards toggle. Replaces the
 * old LearningContentDisplay shell now that the orb (with its play
 * control) lives at App level.
 *
 * Holds the local viewMode state so the user's audio/cards preference
 * persists while the band is mounted but is reset between briefings
 * (e.g., after a dive or reframe). The Audio/Study Cards toggle keeps
 * the same button names so E2E selectors don't budge.
 */
export function ContentBand({
  flashcards,
  audioScript,
  originalContent,
  isInDive,
  isReframing,
  sectionIndex,
  showScript,
  setShowScript,
  voiceError,
  setVoiceError,
  pendingCard,
  cardRevealed,
  setCardRevealed,
  onCardVerdict,
  onDeepDive,
  onExitDive,
  onAnalogyUpdated,
  onReframeAudio,
  onBack,
}: ContentBandProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('audio');

  // Construct the AudioBriefing on demand from the FlashcardSet + AudioScript.
  // Same shape that AudioPlayer used to consume; ListeningBand still expects it.
  const briefing: AudioBriefing = useMemo(() => ({
    briefing_id: flashcards.id,
    title: audioScript.title || flashcards.title || 'Audio Briefing',
    source: '',
    created_at: new Date().toISOString(),
    script: audioScript.content,
    audio_file: undefined,
    sections: audioScript.sections.map(s => ({ id: s.id, content: s.content, heading: s.heading })),
    interruptionPoints: audioScript.interruptionPoints,
  }), [flashcards.id, flashcards.title, audioScript]);

  // The dive's onDeepDive needs sectionIndex injected — wrap so callers
  // (QuizPanel, FlashcardDisplay) only pass the selection term.
  const onDeepDiveWithSection = (selection: string) => onDeepDive(selection, sectionIndex);

  return (
    <div className="space-y-4">
      {/* Audio ↔ Study Cards toggle — hidden in the SLC launch.
          The mid-listen checkpoint quizzes ARE the study mechanism;
          a separate study tab dilutes the offer. v2 re-enables. */}
      {FEATURES.showStudyCardsToggle && (
        <div className="flex justify-center">
          <div className="glass rounded-lg p-1 inline-flex">
            <button
              onClick={() => setViewMode('audio')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'audio'
                  ? 'bg-solar-gold text-solar-900 shadow'
                  : 'text-solar-400 hover:text-solar-100'
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setViewMode('flashcards')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'flashcards'
                  ? 'bg-solar-gold text-solar-900 shadow'
                  : 'text-solar-400 hover:text-solar-100'
              }`}
            >
              Study Cards
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {viewMode === 'audio' ? (
          <ListeningBand
            key="audio"
            briefing={briefing}
            cards={flashcards.cards}
            parentContent={originalContent}
            sectionIndex={sectionIndex}
            showScript={showScript}
            setShowScript={setShowScript}
            voiceError={voiceError}
            setVoiceError={setVoiceError}
            isReframing={isReframing}
            pendingCard={pendingCard}
            cardRevealed={cardRevealed}
            setCardRevealed={setCardRevealed}
            onCardVerdict={onCardVerdict}
            onDeepDive={onDeepDiveWithSection}
            onAnalogyUpdated={onAnalogyUpdated}
            onReframeAudio={onReframeAudio}
            onSwitchToCards={() => setViewMode('flashcards')}
            onBack={onBack}
            isInDive={isInDive}
            onExitDive={onExitDive}
          />
        ) : (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <StudyingBand
              flashcardSet={flashcards}
              briefingId={flashcards.id}
              parentContent={originalContent}
              onDeepDive={(sel) => onDeepDive(sel)}
              onAnalogyUpdated={onAnalogyUpdated}
              onComplete={() => setViewMode('audio')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
