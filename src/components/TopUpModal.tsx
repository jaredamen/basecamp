import { useState } from 'react';

interface TopUpModalProps {
  currentBalance: number;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

const TIERS = [
  { cents: 300, label: '$3', description: '~40-60 sessions' },
  { cents: 500, label: '$5', description: '~70-100 sessions' },
  { cents: 1000, label: '$10', description: '~150-200 sessions' },
  { cents: 2000, label: '$20', description: '~300-400 sessions' },
];

export function TopUpModal({ currentBalance, onClose, onPurchaseComplete }: TopUpModalProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (tierCents: number) => {
    setLoading(tierCents);
    setError(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier: tierCents }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start checkout');
      }

      const { url } = await res.json();
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-dark-800 rounded-xl border border-dark-700 max-w-md w-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Credits</h2>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-dark-300 text-xl"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-dark-300">
          Current balance:{' '}
          <span className="text-white font-semibold">
            ${(currentBalance / 100).toFixed(2)}
          </span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          {TIERS.map((tier) => (
            <button
              key={tier.cents}
              onClick={() => handlePurchase(tier.cents)}
              disabled={loading !== null}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                loading === tier.cents
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-dark-600 bg-dark-700/50 hover:border-blue-500 hover:bg-blue-500/5'
              } disabled:opacity-50 disabled:cursor-wait`}
            >
              <div className="text-2xl font-bold text-white">{tier.label}</div>
              <div className="text-xs text-dark-400 mt-1">{tier.description}</div>
              {loading === tier.cents && (
                <div className="text-xs text-blue-400 mt-2">Redirecting...</div>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <p className="text-xs text-dark-500 text-center">
          Secure payment via Stripe. Credits never expire.
        </p>
      </div>
    </div>
  );
}
