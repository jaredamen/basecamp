import { useState, useEffect } from 'react';
import { useManaged } from '../hooks/useManaged';
import { signInWithGoogle } from '../services/managedAuth';
import { TopUpModal } from './TopUpModal';

interface ManagedSetupFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

export function ManagedSetupFlow({ onComplete, onBack }: ManagedSetupFlowProps) {
  const { session, loading, isAuthenticated, balance, refreshSession, refreshBalance } = useManaged();
  const [showTopUp, setShowTopUp] = useState(false);

  // Check URL params for Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('credits') === 'success') {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      refreshBalance();
    }
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      refreshSession();
    }
  }, [refreshBalance]);

  // If authenticated and has credits, show completion
  if (isAuthenticated && balance > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col justify-center px-6">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-white">You're All Set!</h1>
          <p className="text-xl text-green-300">
            Welcome, {session?.name || 'there'}!
          </p>

          <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-dark-300">Account</span>
              <span className="text-white">{session?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-300">Credits</span>
              <span className="text-green-400 font-semibold">
                ${(balance / 100).toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-sm text-dark-400">
            Your credits cover AI flashcard generation and text-to-speech audio.
            <br />
            You can top up anytime from within the app.
          </p>

          <button
            onClick={onComplete}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transform hover:scale-105 transition-all shadow-lg"
          >
            Start Learning
          </button>
        </div>
      </div>
    );
  }

  // If authenticated but no credits
  if (isAuthenticated && balance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col justify-center px-6">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <div className="text-5xl">👋</div>
          <h1 className="text-3xl font-bold text-white">
            Welcome, {session?.name || 'there'}!
          </h1>
          <p className="text-lg text-dark-300">
            Add some credits to start generating learning content.
          </p>

          <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700 text-left space-y-3">
            <h4 className="font-medium text-white">What do credits cover?</h4>
            <ul className="text-sm text-dark-300 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-green-400">✓</span>
                <span>AI-powered flashcard generation from any documentation</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400">✓</span>
                <span>Text-to-speech audio lessons with natural voices</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400">✓</span>
                <span>Credits never expire — use at your own pace</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setShowTopUp(true)}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all shadow-lg"
          >
            Add Credits
          </button>

          <button
            onClick={onBack}
            className="block mx-auto text-dark-400 hover:text-dark-300 transition-colors text-sm"
          >
            Back to setup options
          </button>

          {showTopUp && (
            <TopUpModal
              currentBalance={0}
              onClose={() => setShowTopUp(false)}
              onPurchaseComplete={refreshBalance}
            />
          )}
        </div>
      </div>
    );
  }

  // Not authenticated — show sign-in
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col justify-center px-6">
      <div className="max-w-lg mx-auto text-center space-y-8">
        <div className="text-5xl">🎓</div>
        <h1 className="text-3xl font-bold text-white">
          Quick Setup
        </h1>
        <p className="text-lg text-dark-300">
          Sign in to get started. No API keys needed — we handle everything.
        </p>

        <div className="space-y-4">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full max-w-sm mx-auto flex items-center justify-center space-x-3 px-6 py-3 bg-white text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>{loading ? 'Loading...' : 'Sign in with Google'}</span>
          </button>
        </div>

        <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700 max-w-sm mx-auto">
          <p className="text-sm text-dark-300">
            After signing in, you'll add credits starting at just <strong className="text-white">$3</strong>. That's enough for <strong className="text-white">40-60 learning sessions</strong>.
          </p>
        </div>

        <button
          onClick={onBack}
          className="text-dark-400 hover:text-dark-300 transition-colors text-sm"
        >
          Back to setup options
        </button>

        {import.meta.env.DEV && (
          <button
            onClick={async () => {
              await fetch('/api/auth/dev-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'dev@test.local', name: 'Dev User' }),
                credentials: 'include',
              });
              refreshSession();
            }}
            className="block mx-auto mt-4 text-xs text-dark-500 hover:text-dark-400 transition-colors font-mono"
          >
            [DEV] Skip OAuth
          </button>
        )}
      </div>
    </div>
  );
}
