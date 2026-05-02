import { useState } from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong rounded-xl max-w-md w-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-solar-100">Add Payment Method</h2>
          <button
            onClick={onClose}
            className="text-solar-500 hover:text-solar-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-solar-400">
            Add a card to keep generating learning content. You'll only be billed for what you use — typically a few cents per lesson.
          </p>

          <div className="bg-solar-700/50 border border-solar-gold/15 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-solar-gold font-mono">~$0.10</span>
              <span className="text-solar-500">per flashcard + audio generation</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-solar-gold font-mono">Monthly</span>
              <span className="text-solar-500">billed at the end of each month</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-solar-gold font-mono">$5.00</span>
              <span className="text-solar-500">monthly spending cap (safety limit)</span>
            </div>
          </div>

          {error && (
            <div className="bg-solar-ember/10 border border-solar-ember/40 rounded-lg p-3">
              <p className="text-solar-ember text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-3">
          <button
            onClick={handleAddPaymentMethod}
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-solar-gold to-solar-amber text-solar-900 rounded-lg font-semibold hover:from-solar-amber hover:to-solar-ember disabled:opacity-50 transition-all"
          >
            {loading ? 'Redirecting to Stripe...' : 'Add Card via Stripe'}
          </button>
          <p className="text-xs text-solar-500 text-center">
            Secure payment via Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
