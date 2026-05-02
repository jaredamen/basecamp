import { useState } from 'react';
import { FlashcardDisplay } from './FlashcardDisplay';
import { AudioPlayer } from './AudioPlayer';
import type { FlashcardSet, AudioScript } from '../services/aiPrompting';

interface LearningContentDisplayProps {
  flashcards: FlashcardSet;
  audioScript: AudioScript;
  /** Source text for the briefing — passed through so dives + analogy
   *  refresh have parent context to focus from. Empty string is fine. */
  originalContent: string;
  /** True when the user is inside a recursive dive. Shows a "back to parent"
   *  pill at the top so they can return without losing the parent briefing. */
  isInDive: boolean;
  /** Renders the briefing as a frozen background layer behind a dive sheet.
   *  Disables all interaction (pointer-events-none), dims the layer, and
   *  hides any FlashcardOverlay that was open at the moment the dive was
   *  triggered (so it doesn't peek through the sheet). The AudioPlayer's
   *  internal sectionIndex state is preserved so popping the sheet returns
   *  the user to exactly where they were. */
  inactive?: boolean;
  /** Surfaces a small in-place banner during an audio re-frame so the user
   *  knows the briefing is regenerating without a full-screen takeover. */
  isReframing?: boolean;
  /** Section the AudioPlayer should start at on next briefing-change. Set
   *  by useContentGeneration on dive exit so the parent's audio resumes
   *  where the user left off. Undefined = start at section 0 (default). */
  audioStartSectionIndex?: number;
  /** Called by AudioPlayer once it has consumed `audioStartSectionIndex`
   *  so the parent can clear it (otherwise re-renders would keep snapping
   *  back to that index). */
  onAudioStartSectionConsumed?: () => void;
  /** Dive trigger. AudioPlayer passes the user's current section so the
   *  parent's playback can be restored on exit. */
  onDeepDive: (selection: string, currentSectionIndex?: number) => void;
  onExitDive: () => void;
  onAnalogyUpdated: (cardId: string, newExplanation: string) => void;
  /** Re-roll the audio briefing with a fresh analogy framing while keeping
   *  the deck unchanged. Wired to AudioPlayer's "Different analogy" button. */
  onReframeAudio: () => void;
  onBack: () => void;
}

type ViewMode = 'audio' | 'flashcards';

export function LearningContentDisplay({
  flashcards,
  audioScript,
  originalContent,
  isInDive,
  inactive = false,
  isReframing = false,
  audioStartSectionIndex,
  onAudioStartSectionConsumed,
  onDeepDive,
  onExitDive,
  onAnalogyUpdated,
  onReframeAudio,
}: LearningContentDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('audio');

  return (
    <div
      className={`min-h-screen flex flex-col bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 ${
        inactive ? 'pointer-events-none opacity-50' : ''
      }`}
      aria-hidden={inactive ? true : undefined}
    >
      <div className="bg-dark-900/95 border-b border-dark-700 px-4 py-3 flex justify-center items-center gap-3">
        {isInDive && (
          <button
            onClick={onExitDive}
            className="text-xs px-3 py-1.5 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 transition-colors"
            aria-label="Back to parent briefing"
          >
            ← Back to parent
          </button>
        )}
        <div className="bg-dark-800/50 rounded-lg p-1 border border-dark-700 inline-flex">
          <button
            onClick={() => setViewMode('audio')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'audio'
                ? 'bg-blue-600 text-white shadow'
                : 'text-dark-300 hover:text-white'
            }`}
          >
            Audio
          </button>
          <button
            onClick={() => setViewMode('flashcards')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'flashcards'
                ? 'bg-blue-600 text-white shadow'
                : 'text-dark-300 hover:text-white'
            }`}
          >
            Study Cards
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {viewMode === 'audio' ? (
          <AudioPlayer
            // Force a fresh mount whenever the audio's identity changes —
            // critically, when the user clicks "Different analogy" and the
            // audioScript is regenerated. AudioPlayer caches per-section
            // TTS blob URLs internally; without remount, those blobs are
            // stale relative to the new sections and the user would hear
            // the OLD audio when they hit play. briefing_id alone isn't
            // enough because it's keyed off flashcards.id (deck unchanged
            // on a reframe). Dive lifecycle preserves audioScript.id on
            // both layers, so this key doesn't churn during dive enter/exit.
            key={audioScript.id}
            briefing={{
              briefing_id: flashcards.id,
              title: audioScript.title || flashcards.title || 'Audio Briefing',
              source: '',
              created_at: new Date().toISOString(),
              script: audioScript.content,
              audio_file: undefined,
              sections: audioScript.sections.map(s => ({ id: s.id, content: s.content })),
              interruptionPoints: audioScript.interruptionPoints,
            }}
            cards={flashcards.cards}
            parentContent={originalContent}
            initialSectionIndex={audioStartSectionIndex}
            onInitialSectionConsumed={onAudioStartSectionConsumed}
            inactive={inactive}
            isReframing={isReframing}
            onDeepDive={onDeepDive}
            onAnalogyUpdated={onAnalogyUpdated}
            onReframeAudio={onReframeAudio}
            onBack={() => setViewMode('flashcards')}
          />
        ) : (
          <FlashcardDisplay
            flashcardSet={flashcards}
            briefingId={flashcards.id}
            parentContent={originalContent}
            onDeepDive={onDeepDive}
            onAnalogyUpdated={onAnalogyUpdated}
            onComplete={() => setViewMode('audio')}
          />
        )}
      </div>
    </div>
  );
}
