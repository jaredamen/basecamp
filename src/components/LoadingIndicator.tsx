interface LoadingIndicatorProps {
  stage: 'idle' | 'fetching' | 'analyzing' | 'flashcards' | 'audio' | 'complete';
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
    { id: 'complete', label: 'Ready!', emoji: '🎉', description: 'Learning content generated successfully' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);
  const currentStageInfo = stages[currentStageIndex] || stages[0];

  // Insufficient credits — specific, actionable error
  if (insufficientCredits) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="text-6xl">💳</div>
          <h1 className="text-2xl font-bold text-white">You need credits to generate content</h1>
          <p className="text-dark-300">
            Add a few dollars in credits to start creating flashcards and audio lessons. Credits start at just $3.
          </p>

          <div className="flex flex-col space-y-3">
            {onAddCredits && (
              <button
                onClick={onAddCredits}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Add Credits
              </button>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 text-dark-400 hover:text-dark-300 transition-colors text-sm"
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
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="text-6xl">😵</div>
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center px-6">
      <div className="max-w-lg mx-auto text-center space-y-8">
        {/* Main Status */}
        <div className="space-y-4">
          <div className="text-6xl animate-bounce">{currentStageInfo.emoji}</div>
          <h1 className="text-3xl font-bold text-white">{currentStageInfo.label}</h1>
          <p className="text-xl text-blue-300">{currentStageInfo.description}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4">
          <div className="w-full bg-dark-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-dark-400">
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
                    ? 'bg-green-600/10 border border-green-600/20'
                    : isCurrent
                    ? 'bg-blue-600/10 border border-blue-600/20'
                    : 'bg-dark-800/30 border border-dark-700'
                }`}
              >
                <div className={`text-2xl ${isCurrent ? 'animate-pulse' : ''}`}>
                  {isCompleted ? '✅' : stageInfo.emoji}
                </div>
                <div className="text-left">
                  <div className={`font-medium ${
                    isCompleted ? 'text-green-300' :
                    isCurrent ? 'text-blue-300' : 'text-dark-400'
                  }`}>
                    {stageInfo.label}
                  </div>
                  <div className="text-sm text-dark-500">
                    {stageInfo.description}
                  </div>
                </div>
                {isCurrent && (
                  <div className="ml-auto">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {isCompleted && (
                  <div className="ml-auto text-green-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Processing Info */}
        <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700">
          <div className="flex items-center space-x-2 mb-2">
            <div className="text-lg">🤖</div>
            <span className="text-sm font-medium text-white">AI Processing</span>
          </div>
          <p className="text-xs text-dark-400">
            Using advanced AI to transform your content into optimized learning materials with expert-level prompting and educational best practices.
          </p>
        </div>
      </div>
    </div>
  );
}
