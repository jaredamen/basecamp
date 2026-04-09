import { useState, useEffect } from 'react';
import { useBYOK } from './hooks/useBYOK';
import { useContentGeneration } from './hooks/useContentGeneration';
import { useManaged } from './hooks/useManaged';
import { BYOKSetupFlow } from './components/BYOKSetupFlow';
import { DocumentationInput } from './components/DocumentationInput';
import { LearningContentDisplay } from './components/LearningContentDisplay';
import { LoadingIndicator } from './components/LoadingIndicator';
import { CreditBalance } from './components/CreditBalance';
import { TopUpModal } from './components/TopUpModal';

type AppState = 'setup' | 'input' | 'generating' | 'content';

function App() {
  const [appState, setAppState] = useState<AppState>('setup');
  const { isConfigured, isManaged } = useBYOK();
  const {
    isGenerating,
    stage,
    progress,
    error,
    insufficientCredits,
    flashcards,
    audioScript,
    generateContent,
    reset: resetGeneration
  } = useContentGeneration();
  const { balance, refreshBalance } = useManaged();
  const [showTopUp, setShowTopUp] = useState(false);

  // Handle Stripe redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('credits') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      refreshBalance();
    }
  }, [refreshBalance]);

  // Show top-up modal when insufficient credits error occurs
  useEffect(() => {
    if (insufficientCredits && isManaged) {
      setShowTopUp(true);
    }
  }, [insufficientCredits, isManaged]);

  const handleSetupComplete = () => {
    setAppState('input');
  };

  const handleGenerateContent = async (input: { url?: string; text?: string; type: 'url' | 'text' }) => {
    setAppState('generating');
    await generateContent(input);

    setTimeout(() => {
      if (flashcards && audioScript) {
        setAppState('content');
      } else {
        setAppState('input');
      }
    }, 1000);
  };

  const handleBackToInput = () => {
    resetGeneration();
    setAppState('input');
  };

  // Determine which state to show
  let currentState = appState;
  if (currentState === 'setup' && isConfigured) {
    currentState = 'input';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Credit balance header for managed users */}
      {isManaged && currentState !== 'setup' && (
        <div className="fixed top-4 right-4 z-40">
          <CreditBalance
            balanceCents={balance}
            onBalanceUpdate={refreshBalance}
          />
        </div>
      )}

      {currentState === 'setup' && (
        <BYOKSetupFlow onComplete={handleSetupComplete} />
      )}

      {currentState === 'input' && (
        <DocumentationInput
          onGenerate={handleGenerateContent}
          isGenerating={isGenerating}
        />
      )}

      {currentState === 'generating' && (
        <LoadingIndicator
          stage={stage}
          progress={progress}
          error={error}
          onRetry={handleBackToInput}
        />
      )}

      {currentState === 'content' && flashcards && audioScript && (
        <LearningContentDisplay
          flashcards={flashcards}
          audioScript={audioScript}
          onBack={handleBackToInput}
        />
      )}

      {/* Top-up modal for insufficient credits */}
      {showTopUp && (
        <TopUpModal
          currentBalance={balance}
          onClose={() => setShowTopUp(false)}
          onPurchaseComplete={refreshBalance}
        />
      )}
    </div>
  );
}

export default App;
