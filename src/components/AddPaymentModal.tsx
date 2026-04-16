import { useState } from 'react';

interface AddPaymentModalProps {
  onClose: () => void;
}

export function AddPaymentModal({ onClose }: AddPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPaymentMethod = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start payment setup');
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl max-w-md w-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Payment Method</h2>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-dark-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-dark-300">
            Add a card to keep generating learning content. You'll only be billed for what you use — typically a few cents per lesson.
          </p>

          <div className="bg-dark-700/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-green-400">~$0.10</span>
              <span className="text-dark-400">per flashcard + audio generation</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-green-400">Monthly</span>
              <span className="text-dark-400">billed at the end of each month</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-green-400">$5.00</span>
              <span className="text-dark-400">monthly spending cap (safety limit)</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-3">
          <button
            onClick={handleAddPaymentMethod}
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
          >
            {loading ? 'Redirecting to Stripe...' : 'Add Card via Stripe'}
          </button>
          <p className="text-xs text-dark-500 text-center">
            Secure payment via Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
