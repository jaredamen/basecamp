import { useState } from 'react';
import { FlashcardDisplay } from './FlashcardDisplay';
import { AudioPlayer } from './AudioPlayer';
import type { FlashcardSet, AudioScript } from '../services/aiPrompting';

interface LearningContentDisplayProps {
  flashcards: FlashcardSet;
  audioScript: AudioScript;
  onBack: () => void;
}

type ViewMode = 'audio' | 'flashcards';

/**
 * Two-mode shell — Audio briefing (default) and Study Cards. The empty
 * Overview tab is gone; both surfaces always render with the tab selector
 * pinned to the top so switching between them is one click.
 */
export function LearningContentDisplay({
  flashcards,
  audioScript,
}: LearningContentDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('audio');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      <div className="bg-dark-900/95 border-b border-dark-700 px-4 py-3 flex justify-center">
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
            onBack={() => setViewMode('flashcards')}
          />
        ) : (
          <FlashcardDisplay
            flashcardSet={flashcards}
            onComplete={() => setViewMode('audio')}
          />
        )}
      </div>
    </div>
  );
}
