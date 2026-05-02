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
    <div className="min-h-screen bg-gradient-to-br from-solar-900 via-solar-800 to-solar-900 flex flex-col justify-center px-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="text-5xl">🚀</div>
          <h1 className="text-3xl font-bold text-solar-100">
            Welcome to Basecamp
          </h1>
          <p className="text-xl text-solar-gold">
            Transform Technical Documentation Into Engaging Learning
          </p>
          <p className="text-lg text-solar-400">
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
                : 'border-solar-gold/15 bg-solar-800/50 hover:border-solar-gold/25 hover:bg-solar-800'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🎓</div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-semibold text-solar-100">
                    Handle it for me
                  </h3>
                  <span className="text-xs bg-green-600/30 text-green-300 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-solar-400">
                  Sign in with Google, add a few dollars in credits, and start learning immediately. No API keys, no configuration.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs bg-green-600/20 text-green-300 px-2 py-1 rounded">
                    No Setup
                  </span>
                  <span className="text-xs bg-solar-gold/20 text-solar-gold px-2 py-1 rounded">
                    Instant Start
                  </span>
                  <span className="text-xs bg-solar-amber/15 text-solar-amber px-2 py-1 rounded">
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
                ? 'border-solar-gold bg-solar-gold/10 shadow-lg shadow-solar-gold/30'
                : 'border-solar-gold/15 bg-solar-800/50 hover:border-solar-gold/25 hover:bg-solar-800'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🔑</div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-solar-100">
                  I'll use my own OpenAI key
                </h3>
                <p className="text-solar-400">
                  Bring your own OpenAI key. Pay OpenAI directly, no markup. Same product.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-6 py-3 text-solar-500 hover:text-solar-400 transition-colors"
            >
              Skip Setup
            </button>
          )}

          <button
            onClick={handleContinue}
            disabled={!selectedPath}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              selectedPath
                ? 'bg-gradient-to-r from-solar-gold to-solar-amber text-solar-100 hover:from-solar-amber hover:to-solar-ember transform hover:scale-105 shadow-lg'
                : 'bg-solar-700 text-solar-500 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
