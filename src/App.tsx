import { useState, useEffect, useRef } from 'react';
import { useBYOK } from './hooks/useBYOK';
import { useContentGeneration } from './hooks/useContentGeneration';
import { useManaged } from './hooks/useManaged';
import { BYOKSetupFlow } from './components/BYOKSetupFlow';
import { DocumentationInput } from './components/DocumentationInput';
import { LearningContentDisplay } from './components/LearningContentDisplay';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AppHeader } from './components/AppHeader';
import { AddPaymentModal } from './components/AddPaymentModal';
import { AudioPlayer } from './components/AudioPlayer';
import { LibraryView } from './components/LibraryView';
import { DEMO_PAUSE_AND_QUIZ_BRIEFING, DEMO_FLASHCARDS } from './devDemoBriefing';
import { briefingLibrary, type SavedBriefing } from './services/briefingLibrary';

type AppState = 'setup' | 'input' | 'generating' | 'content' | 'library';

// Dev-only: visiting /?demo=audio short-circuits to the AudioPlayer with a
// hardcoded fixture briefing. Lets you verify Pause-and-Quiz UX without
// running the API locally or spending LLM/TTS credits.
const isDevDemoAudio = (): boolean => {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('demo') === 'audio';
};

function App() {
  if (isDevDemoAudio()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col">
        <AudioPlayer
          briefing={DEMO_PAUSE_AND_QUIZ_BRIEFING}
          cards={DEMO_FLASHCARDS}
          onBack={() => {
            window.history.replaceState({}, '', window.location.pathname);
            window.location.reload();
          }}
        />
      </div>
    );
  }
  return <AppMain />;
}

function AppMain() {
  const [appState, setAppState] = useState<AppState>('setup');
  const { isConfigured, isManaged, clearConfig } = useBYOK();
  const {
    stage,
    progress,
    error,
    insufficientCredits,
    flashcards,
    audioScript,
    originalContent,
    wasLoadedFromLibrary,
    isInDive,
    generateContent,
    reset: resetGeneration,
    loadFromLibrary,
    deepDive,
    exitDive,
    updateCardAnalogy,
  } = useContentGeneration();
  const { session, billing, isAuthenticated, loading: managedLoading, refreshBilling, signOut } = useManaged();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Handle Stripe redirect params (after adding payment method)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success' || params.get('credits') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      refreshBilling();
    }
  }, [refreshBilling]);

  // Auto-transition based on the generation state machine. A 'diving' stage
  // means a recursive dive is in flight — show the LoadingIndicator full
  // screen so the user sees the wait. 'complete' lands them in the content
  // view (post-dive AND post-initial-generation share this path).
  const lastSavedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (stage === 'diving') {
      setAppState('generating');
      return;
    }
    if (stage === 'complete' && flashcards && audioScript) {
      setAppState('content');
      refreshBilling();
      // Skip auto-save for dives (isInDive=true) — they're transient sub-views
      // off a parent briefing; we don't want a half-dozen "Stoicism: dichotomy"
      // dive entries cluttering the library yet. Once SavedBriefing carries
      // parentId we can save them with a clear parent-link.
      if (!wasLoadedFromLibrary && !isInDive) {
        const key = `${flashcards.id}::${audioScript.id}`;
        if (lastSavedKeyRef.current !== key) {
          briefingLibrary.save({
            title: flashcards.title,
            source: flashcards.metadata.sourceType === 'url' ? flashcards.metadata.sourceContent : '',
            flashcards,
            audioScript,
          });
          lastSavedKeyRef.current = key;
        }
      }
    }
  }, [stage, flashcards, audioScript, refreshBilling, wasLoadedFromLibrary, isInDive]);

  const handleSetupComplete = () => {
    setAppState('input');
  };

  const handleGenerateContent = async (input: { url?: string; text?: string; type: 'url' | 'text' }) => {
    setAppState('generating');
    await generateContent(input);
  };

  const handleNavigateHome = () => {
    setAppState('input');
  };

  const handleNavigateContent = () => {
    if (flashcards && audioScript) {
      setAppState('content');
    }
  };

  const handleNavigateLibrary = () => {
    setAppState('library');
  };

  const handleOpenFromLibrary = (saved: SavedBriefing) => {
    loadFromLibrary(saved.flashcards, saved.audioScript);
    setAppState('content');
  };

  const handleBackToInput = () => {
    resetGeneration();
    setAppState('input');
  };

  const handleSignOut = async () => {
    await signOut();
    clearConfig();
    resetGeneration();
    setAppState('setup');
  };

  const handleAddPaymentMethod = () => {
    setShowPaymentModal(true);
  };

  // Determine which state to show
  let currentState = appState;

  // For managed users: must be authenticated to access the app.
  // If localStorage says managed but session is null (expired/logged out),
  // force them back to setup so they see the sign-in screen.
  const managedButNotAuth = isManaged && !isAuthenticated && !managedLoading;

  if (managedButNotAuth) {
    currentState = 'setup';
  } else if (currentState === 'setup' && isConfigured && (!isManaged || isAuthenticated)) {
    currentState = 'input';
  }

  // Only show header when user is actually authenticated (managed) or using BYOK
  const showHeader = isManaged && isAuthenticated && currentState !== 'setup';
  const hasContent = !!(flashcards && audioScript);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Persistent header — only for authenticated managed users */}
      {showHeader && (
        <AppHeader
          userName={session?.name || session?.email}
          usageCents={billing?.currentMonthUsageCents ?? 0}
          hasPaymentMethod={billing?.hasPaymentMethod ?? false}
          freeRemainingCents={billing?.freeRemainingCents ?? 50}
          hasContent={hasContent}
          libraryCount={briefingLibrary.count()}
          currentView={
            currentState === 'content' ? 'content' :
            currentState === 'library' ? 'library' :
            currentState === 'generating' ? 'generating' :
            'input'
          }
          onNavigateHome={handleNavigateHome}
          onNavigateContent={handleNavigateContent}
          onNavigateLibrary={handleNavigateLibrary}
          onAddPaymentMethod={handleAddPaymentMethod}
          onSignOut={handleSignOut}
        />
      )}

      <div className={showHeader ? 'pt-14' : ''}>
        {currentState === 'setup' && (
          <BYOKSetupFlow onComplete={handleSetupComplete} />
        )}

        {currentState === 'input' && (
          <DocumentationInput
            onGenerate={handleGenerateContent}
            isGenerating={appState === 'generating'}
          />
        )}

        {currentState === 'generating' && (
          <LoadingIndicator
            stage={stage}
            progress={progress}
            error={error}
            insufficientCredits={insufficientCredits}
            onRetry={handleBackToInput}
            onAddCredits={handleAddPaymentMethod}
          />
        )}

        {currentState === 'content' && flashcards && audioScript && (
          <LearningContentDisplay
            flashcards={flashcards}
            audioScript={audioScript}
            originalContent={originalContent ?? ''}
            isInDive={isInDive}
            onDeepDive={deepDive}
            onExitDive={exitDive}
            onAnalogyUpdated={updateCardAnalogy}
            onBack={handleNavigateHome}
          />
        )}

        {currentState === 'library' && (
          <LibraryView
            onOpen={handleOpenFromLibrary}
            onBack={handleNavigateHome}
          />
        )}
      </div>

      {showPaymentModal && (
        <AddPaymentModal
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}

export default App;
