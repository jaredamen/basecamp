import { useState } from 'react';
import type { SetupPath } from '../types/byok';

export type { SetupPath };

interface SetupPathSelectorProps {
  onPathSelected: (path: SetupPath) => void;
  onSkip?: () => void;
}

export function SetupPathSelector({ onPathSelected, onSkip }: SetupPathSelectorProps) {
  const [selectedPath, setSelectedPath] = useState<SetupPath | null>(null);

  const handleContinue = () => {
    if (selectedPath) {
      onPathSelected(selectedPath);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col justify-center px-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="text-5xl">🚀</div>
          <h1 className="text-3xl font-bold text-white">
            Welcome to Basecamp
          </h1>
          <p className="text-xl text-blue-300">
            Transform Technical Documentation Into Engaging Learning
          </p>
          <p className="text-lg text-dark-300">
            How would you like to get started?
          </p>
        </div>

        {/* Path Selection */}
        <div className="grid gap-6 max-w-xl mx-auto">
          {/* Managed Path — recommended for most users */}
          <button
            onClick={() => setSelectedPath('managed')}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              selectedPath === 'managed'
                ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                : 'border-dark-700 bg-dark-800/50 hover:border-dark-600 hover:bg-dark-800'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🎓</div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-semibold text-white">
                    Handle it for me
                  </h3>
                  <span className="text-xs bg-green-600/30 text-green-300 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-dark-300">
                  Sign in with Google, add a few dollars in credits, and start learning immediately. No API keys, no configuration.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs bg-green-600/20 text-green-300 px-2 py-1 rounded">
                    No Setup
                  </span>
                  <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                    Instant Start
                  </span>
                  <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded">
                    Pay As You Go
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* BYOK Path */}
          <button
            onClick={() => setSelectedPath('simple')}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              selectedPath === 'simple'
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                : 'border-dark-700 bg-dark-800/50 hover:border-dark-600 hover:bg-dark-800'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🔑</div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  I'll use my own API keys
                </h3>
                <p className="text-dark-300">
                  Bring your own OpenAI, Anthropic, or Google AI keys. Pay providers directly with no markup.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                    Guided Setup
                  </span>
                  <span className="text-xs bg-yellow-600/20 text-yellow-300 px-2 py-1 rounded">
                    No Markup
                  </span>
                  <span className="text-xs bg-green-600/20 text-green-300 px-2 py-1 rounded">
                    Full Control
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Key Features Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700">
            <div className="text-2xl mb-2">📚</div>
            <h4 className="font-semibold text-dark-100">Smart Flashcards</h4>
            <p className="text-xs text-dark-400 mt-1">
              AI generates study cards from any technical documentation.
            </p>
          </div>

          <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700">
            <div className="text-2xl mb-2">🎙️</div>
            <h4 className="font-semibold text-dark-100">Audio Lessons</h4>
            <p className="text-xs text-dark-400 mt-1">
              Listen to AI-narrated summaries on the go.
            </p>
          </div>

          <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700">
            <div className="text-2xl mb-2">🔒</div>
            <h4 className="font-semibold text-dark-100">Your Data, Your Keys</h4>
            <p className="text-xs text-dark-400 mt-1">
              Everything stays local. No data leaves your browser.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-6 py-3 text-dark-400 hover:text-dark-300 transition-colors"
            >
              Skip Setup
            </button>
          )}

          <button
            onClick={handleContinue}
            disabled={!selectedPath}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              selectedPath
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 shadow-lg'
                : 'bg-dark-700 text-dark-400 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>

        {/* Cost Info */}
        <div className="text-center space-y-2">
          <p className="text-sm text-dark-400">
            💰 Credits start at just $3 — enough for 40-60 learning sessions
          </p>
          <p className="text-xs text-dark-500">
            Or bring your own API keys and pay providers directly
          </p>
        </div>
      </div>
    </div>
  );
}
