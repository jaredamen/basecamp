import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface LoadingIndicatorProps {
  stage: 'idle' | 'fetching' | 'analyzing' | 'flashcards' | 'audio' | 'diving' | 'reframing' | 'complete';
  progress: number;
  error?: string;
  insufficientCredits?: boolean;
  onRetry?: () => void;
  onAddCredits?: () => void;
}

export function LoadingIndicator({ stage, progress, error, insufficientCredits, onRetry, onAddCredits }: LoadingIndicatorProps) {
  const stages = [
    { id: 'fetching', label: 'Fetching Content', emoji: '📄', description: 'Retrieving content from source' },
    { id: 'analyzing', label: 'Analyzing Content', emoji: '🔍', description: 'Understanding structure and concepts' },
    { id: 'flashcards', label: 'Creating Flashcards', emoji: '🧠', description: 'Generating learning cards with AI' },
    { id: 'audio', label: 'Preparing Audio', emoji: '🎙️', description: 'Creating expert narrative script' },
    { id: 'diving', label: 'Diving Deeper', emoji: '🤿', description: 'Generating a focused mini-briefing on your selection' },
    { id: 'reframing', label: 'Re-framing the Lesson', emoji: '💡', description: 'Same content, fresh analogy — pulling a different parable' },
    { id: 'complete', label: 'Ready!', emoji: '🎉', description: 'Learning content generated successfully' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);
  const currentStageInfo = stages[currentStageIndex] || stages[0];

  // Insufficient credits — specific, actionable error
  if (insufficientCredits) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-solar-900 via-solar-800 to-solar-900 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="text-6xl">💳</div>
          <h1 className="text-2xl font-bold text-solar-100">Add a payment method to continue</h1>
          <p className="text-solar-400">
            Your free generations are used up. Add a card to keep learning — you'll only be billed for what you use, about $0.10 per lesson.
          </p>

          <div className="flex flex-col space-y-3">
            {onAddCredits && (
              <button
                onClick={onAddCredits}
                className="px-6 py-3 bg-gradient-to-r from-solar-gold to-solar-amber text-solar-900 rounded-lg font-semibold hover:from-solar-amber hover:to-solar-ember transition-all"
              >
                Add Payment Method
              </button>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 text-solar-500 hover:text-solar-100 transition-colors text-sm"
              >
                Back to home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // General error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-solar-900 via-solar-800 to-solar-900 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="text-6xl">😵</div>
          <h1 className="text-2xl font-bold text-solar-100">Something went wrong</h1>
          <div className="bg-solar-ember/10 border border-solar-ember/40 rounded-lg p-4">
            <p className="text-solar-ember text-sm">{error}</p>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-solar-gold text-solar-900 rounded-lg hover:bg-solar-amber transition-colors font-semibold"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-solar-900 via-solar-800 to-solar-900 flex items-center justify-center px-6">
      <div className="max-w-lg mx-auto text-center space-y-8">
        {/* Main Status */}
        <div className="space-y-4">
          <div className="text-6xl animate-bounce">{currentStageInfo.emoji}</div>
          <h1 className="text-3xl font-bold text-solar-100">{currentStageInfo.label}</h1>
          <p className="text-xl text-solar-gold/90">{currentStageInfo.description}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4">
          <div className="w-full bg-solar-700 rounded-full h-4 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-solar-gold to-solar-amber h-4 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-sm text-solar-500 font-mono">
            <span>Processing...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="space-y-3">
          {stages.map((stageInfo, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;

            return (
              <div
                key={stageInfo.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                  isCompleted
                    ? 'bg-green-600/10 border border-green-600/30'
                    : isCurrent
                    ? 'bg-solar-gold/10 border border-solar-gold/30'
                    : 'glass'
                }`}
              >
                <div className={`text-2xl ${isCurrent ? 'animate-pulse' : ''}`}>
                  {isCompleted ? '✅' : stageInfo.emoji}
                </div>
                <div className="text-left">
                  <div className={`font-medium ${
                    isCompleted ? 'text-green-300' :
                    isCurrent ? 'text-solar-gold' : 'text-solar-500'
                  }`}>
                    {stageInfo.label}
                  </div>
                  <div className="text-sm text-solar-500/80">
                    {stageInfo.description}
                  </div>
                </div>
                {isCurrent && (
                  <div className="ml-auto">
                    <div className="w-6 h-6 border-2 border-solar-gold border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {isCompleted && (
                  <div className="ml-auto text-green-400">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Processing Info */}
        <div className="glass rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="text-lg">🤖</div>
            <span className="text-sm font-medium text-solar-100">AI Processing</span>
          </div>
          <p className="text-xs text-solar-400">
            Using advanced AI to transform your content into optimized learning materials with expert-level prompting and educational best practices.
          </p>
        </div>
      </div>
    </div>
  );
}
