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
  onBack 
}: LearningContentDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  if (viewMode === 'flashcards') {
    return (
      <FlashcardDisplay 
        flashcardSet={flashcards}
        onComplete={() => setViewMode('overview')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <button
            onClick={onBack}
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Input
          </button>
          
          <div className="text-5xl">🎓</div>
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
                📊 Overview
              </button>
              <button
                onClick={() => setViewMode('flashcards')}
                className="px-4 py-2 rounded-md font-medium transition-all text-dark-300 hover:text-white"
              >
                🧠 Study Cards
              </button>
              <button
                onClick={() => setViewMode('audio')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'audio'
                    ? 'bg-purple-600 text-white'
                    : 'text-dark-300 hover:text-white'
                }`}
              >
                🎙️ Audio
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'overview' && (
          <div className="space-y-8">
            {/* Learning Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">🧠</div>
                  <h3 className="text-xl font-semibold text-white">{flashcards.cards.length}</h3>
                  <p className="text-dark-300">Flashcards Created</p>
                  <p className="text-sm text-dark-400 mt-2">
                    Est. study time: {flashcards.metadata.estimatedTime} min
                  </p>
                </div>
              </div>
              
              <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <h3 className="text-xl font-semibold text-white capitalize">{flashcards.metadata.difficulty}</h3>
                  <p className="text-dark-300">Difficulty Level</p>
                  <p className="text-sm text-dark-400 mt-2">
                    Adapted to your background
                  </p>
                </div>
              </div>
              
              <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">🎙️</div>
                  <h3 className="text-xl font-semibold text-white">
                    {Math.floor((audioScript.metadata.estimatedDuration || 0) / 60)}:{((audioScript.metadata.estimatedDuration || 0) % 60).toString().padStart(2, '0')}
                  </h3>
                  <p className="text-dark-300">Audio Duration</p>
                  <p className="text-sm text-dark-400 mt-2">
                    Expert narration ready
                  </p>
                </div>
              </div>
            </div>

            {/* Topics Covered */}
            {flashcards.metadata.topics.length > 0 && (
              <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Topics Covered</h3>
                <div className="flex flex-wrap gap-3">
                  {flashcards.metadata.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-blue-600/20 text-blue-300 rounded-full border border-blue-600/30 text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setViewMode('flashcards')}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl p-8 text-left transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">🧠</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Start Studying</h3>
                    <p className="text-green-100">
                      Review {flashcards.cards.length} flashcards with spaced repetition
                    </p>
                    <div className="flex space-x-4 mt-3 text-sm">
                      <span className="bg-green-700/30 px-2 py-1 rounded">Active Recall</span>
                      <span className="bg-green-700/30 px-2 py-1 rounded">Interactive</span>
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setViewMode('audio')}
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl p-8 text-left transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">🎙️</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Listen & Learn</h3>
                    <p className="text-purple-100">
                      Expert audio narrative with premium voices
                    </p>
                    <div className="flex space-x-4 mt-3 text-sm">
                      <span className="bg-purple-700/30 px-2 py-1 rounded">ElevenLabs</span>
                      <span className="bg-purple-700/30 px-2 py-1 rounded">Hands-free</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Content Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sample Flashcard */}
              <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Sample Flashcard</h3>
                <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-600">
                  <div className="text-sm text-blue-300 mb-2">Question:</div>
                  <div className="text-white font-medium mb-3">{flashcards.cards[0].front}</div>
                  <div className="text-sm text-green-300 mb-2">Answer:</div>
                  <div className="text-dark-300 text-sm">{flashcards.cards[0].back}</div>
                </div>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setViewMode('flashcards')}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    View all {flashcards.cards.length} cards →
                  </button>
                </div>
              </div>

              {/* Audio Preview */}
              <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Audio Script Preview</h3>
                <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-600">
                  <div className="text-sm text-dark-300 line-clamp-6">
                    {audioScript.sections[0]?.content?.substring(0, 200) || audioScript.content.substring(0, 200)}...
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setViewMode('audio')}
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    Listen to full narrative →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'audio' && (
          <div className="space-y-6">
            <AudioPlayer
              briefing={{
                briefing_id: 'audio-script',
                title: audioScript.title || 'Audio Briefing',
                source: '',
                created_at: new Date().toISOString(),
                script: audioScript.content,
                audio_file: undefined
              }}
              onBack={() => setViewMode('overview')}
            />
            
            {/* Script Content */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Audio Script</h3>
              <div className="space-y-4">
                {audioScript.sections.map((section) => (
                  <div key={section.id} className="border-l-4 border-purple-600/30 pl-4">
                    <h4 className="font-medium text-purple-300 mb-2">{section.heading}</h4>
                    <p className="text-dark-300 text-sm leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}