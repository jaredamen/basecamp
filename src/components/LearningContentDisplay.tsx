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
  onDeepDive: (selection: string) => void;
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
  onDeepDive,
  onExitDive,
  onAnalogyUpdated,
  onReframeAudio,
}: LearningContentDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('audio');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
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
