import { useState } from 'react';
import { FlashcardDisplay } from './FlashcardDisplay';
import { AudioPlayer } from './AudioPlayer';
import type { FlashcardSet, AudioScript } from '../services/aiPrompting';

interface LearningContentDisplayProps {
  flashcards: FlashcardSet;
  audioScript: AudioScript;
  onBack: () => void;
}

type ViewMode = 'overview' | 'flashcards' | 'audio';

export function LearningContentDisplay({
  flashcards,
  audioScript,
  onBack: _onBack
}: LearningContentDisplayProps) {
  // Default to 'audio' — the Overview tab is currently a placeholder; landing
  // straight in the audio briefing matches the SLC story ("hit play, listen,
  // learn"). When Overview gets real content this can flip back.
  const [viewMode, setViewMode] = useState<ViewMode>('audio');

  if (viewMode === 'flashcards') {
    return (
      <FlashcardDisplay
        flashcardSet={flashcards}
        onComplete={() => setViewMode('overview')}
      />
    );
  }

  if (viewMode === 'audio') {
    return (
      <AudioPlayer
        briefing={{
          briefing_id: flashcards.id, // shared id so per-card review history attaches to the deck
          title: audioScript.title || 'Audio Briefing',
          source: '',
          created_at: new Date().toISOString(),
          script: audioScript.content,
          audio_file: undefined,
          sections: audioScript.sections.map(s => ({ id: s.id, content: s.content })),
          interruptionPoints: audioScript.interruptionPoints,
        }}
        cards={flashcards.cards}
        onBack={() => setViewMode('overview')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">{flashcards.title}</h1>
          <p className="text-xl text-blue-300">{flashcards.description}</p>

          {/* View Mode Selector */}
          <div className="flex justify-center">
            <div className="bg-dark-800/50 rounded-lg p-1 border border-dark-700">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'text-dark-300 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setViewMode('flashcards')}
                className="px-4 py-2 rounded-md font-medium transition-all text-dark-300 hover:text-white"
              >
                Study Cards
              </button>
              <button
                onClick={() => setViewMode('audio')}
                className="px-4 py-2 rounded-md font-medium transition-all text-dark-300 hover:text-white"
              >
                Audio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
