interface LoadingIndicatorProps {
  stage: 'idle' | 'fetching' | 'analyzing' | 'flashcards' | 'audio' | 'diving' | 'reframing' | 'complete';
  progress: number;
  error?: string;
  insufficientCredits?: boolean;
  onRetry?: () => void;
  onAddCredits?: () => void;
}

/**
 * Generation status — orb-driven now. While generation is in flight,
 * the persistent orb (at App level) shows Loading state, the caption
 * cycles through stages + motivationals (driven by useOrbVoice), and
 * JARVIS speaks them out loud.
 *
 * This component renders only the escape-hatch surfaces:
 *   - Insufficient credits → CTA to add a payment method
 *   - General error → CTA to retry
 *
 * Happy path: render nothing — the orb tells the user everything they
 * need to know.
 */
export function LoadingIndicator({ error, insufficientCredits, onRetry, onAddCredits }: LoadingIndicatorProps) {
  if (insufficientCredits) {
    return (
      <div className="max-w-md mx-auto text-center space-y-5 glass rounded-2xl p-6">
        <div className="text-5xl">💳</div>
        <h1 className="text-xl font-bold text-solar-100">Add a payment method to continue</h1>
        <p className="text-solar-400 text-sm">
          Your free generations are used up. Add a card to keep learning — you'll only be billed for what you use, about $0.10 per lesson.
        </p>
        <div className="flex flex-col gap-2">
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
              className="px-6 py-2 text-solar-500 hover:text-solar-100 transition-colors text-xs font-mono uppercase tracking-wider"
            >
              Back to home
            </button>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center space-y-5 glass rounded-2xl p-6">
        <div className="text-5xl">😵</div>
        <h1 className="text-xl font-bold text-solar-100">Something went wrong</h1>
        <div className="bg-solar-ember/10 border border-solar-ember/40 rounded-lg p-3">
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
    );
  }

  // Happy path — orb at App level handles status. Nothing to render.
  return null;
}
