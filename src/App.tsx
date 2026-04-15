import { useState, useEffect } from 'react';
import { useBYOK } from './hooks/useBYOK';
import { useContentGeneration } from './hooks/useContentGeneration';
import { useManaged } from './hooks/useManaged';
import { BYOKSetupFlow } from './components/BYOKSetupFlow';
import { DocumentationInput } from './components/DocumentationInput';
import { LearningContentDisplay } from './components/LearningContentDisplay';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AppHeader } from './components/AppHeader';
import { TopUpModal } from './components/TopUpModal';

type AppState = 'setup' | 'input' | 'generating' | 'content';

function App() {
  const [appState, setAppState] = useState<AppState>('setup');
  const { isConfigured, isManaged } = useBYOK();
  const {
    stage,
    progress,
    error,
    insufficientCredits,
    flashcards,
    audioScript,
    generateContent,
    reset: resetGeneration
  } = useContentGeneration();
  const { session, balance, refreshBalance, signOut } = useManaged();
  const [showTopUp, setShowTopUp] = useState(false);

  // Handle Stripe redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('credits') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      refreshBalance();
    }
  }, [refreshBalance]);

  // Auto-transition to content when generation completes successfully
  useEffect(() => {
    if (stage === 'complete' && flashcards && audioScript) {
      setAppState('content');
    }
  }, [stage, flashcards, audioScript]);

  const handleSetupComplete = () => {
    setAppState('input');
  };

  const handleGenerateContent = async (input: { url?: string; text?: string; type: 'url' | 'text' }) => {
    setAppState('generating');
    await generateContent(input);
    // Don't auto-transition here — the useEffect above handles success,
    // and errors stay on the generating screen so the user can read them.
  };

  // Navigate to input without losing generated content
  const handleNavigateHome = () => {
    setAppState('input');
  };

  // Navigate to content (only if content exists)
  const handleNavigateContent = () => {
    if (flashcards && audioScript) {
      setAppState('content');
    }
  };

  // Go back from error/loading to input
  const handleBackToInput = () => {
    resetGeneration();
    setAppState('input');
  };

  const handleSignOut = async () => {
    await signOut();
    resetGeneration();
    setAppState('setup');
  };

  // Determine which state to show
  let currentState = appState;
  if (currentState === 'setup' && isConfigured) {
    currentState = 'input';
  }

  const hasContent = !!(flashcards && audioScript);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Persistent header for all non-setup screens */}
      {isManaged && currentState !== 'setup' && (
        <AppHeader
          userName={session?.name || session?.email}
          balanceCents={balance}
          hasContent={hasContent}
          currentView={currentState === 'content' ? 'content' : currentState === 'generating' ? 'generating' : 'input'}
          onNavigateHome={handleNavigateHome}
          onNavigateContent={handleNavigateContent}
          onAddCredits={() => setShowTopUp(true)}
          onSignOut={handleSignOut}
        />
      )}

      {/* Add top padding when header is shown */}
      <div className={isManaged && currentState !== 'setup' ? 'pt-14' : ''}>
        {currentState === 'setup' && (
          <BYOKSetupFlow onComplete={handleSetupComplete} />
        )}

        {currentState === 'input' && (
          <DocumentationInput
            onGenerate={handleGenerateContent}
            isGenerating={false}
          />
        )}

        {currentState === 'generating' && (
          <LoadingIndicator
            stage={stage}
            progress={progress}
            error={error}
            insufficientCredits={insufficientCredits}
            onRetry={handleBackToInput}
            onAddCredits={() => setShowTopUp(true)}
          />
        )}

        {currentState === 'content' && flashcards && audioScript && (
          <LearningContentDisplay
            flashcards={flashcards}
            audioScript={audioScript}
            onBack={handleNavigateHome}
          />
        )}
      </div>

      {/* Top-up modal */}
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
