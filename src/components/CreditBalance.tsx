import { useState } from 'react';
import { TopUpModal } from './TopUpModal';

interface CreditBalanceProps {
  balanceCents: number;
  onBalanceUpdate: () => void;
}

export function CreditBalance({ balanceCents, onBalanceUpdate }: CreditBalanceProps) {
  const [showTopUp, setShowTopUp] = useState(false);
  const dollars = (balanceCents / 100).toFixed(2);

  const colorClass =
    balanceCents > 200
      ? 'text-green-400'
      : balanceCents > 50
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <>
      <button
        onClick={() => setShowTopUp(true)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg hover:border-dark-600 transition-colors"
        title="Click to add credits"
      >
        <span className="text-xs text-dark-400">Credits:</span>
        <span className={`text-sm font-semibold ${colorClass}`}>${dollars}</span>
      </button>

      {showTopUp && (
        <TopUpModal
          currentBalance={balanceCents}
          onClose={() => setShowTopUp(false)}
          onPurchaseComplete={onBalanceUpdate}
        />
      )}
    </>
  );
}
