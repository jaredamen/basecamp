import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useContentGeneration } from './hooks/useContentGeneration';
import { useManaged } from './hooks/useManaged';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { AppShell } from './components/AppShell';
import { OrbStage } from './components/OrbStage';
import { AppHeader } from './components/AppHeader';
import { AddPaymentModal } from './components/AddPaymentModal';
import { SignInBand } from './components/bands/SignInBand';
import { TopicInputBand } from './components/bands/TopicInputBand';
import { GeneratingBand } from './components/bands/GeneratingBand';
import { ContentBand } from './components/bands/ContentBand';
import { LibraryBand } from './components/bands/LibraryBand';
import { DiveOverlay } from './components/bands/DiveOverlay';
import { DiveLoader } from './components/DiveLoader';
import type { FlareState } from './components/SolarFlare';
import type { AudioBriefing } from './types';
import { briefingLibrary, type SavedBriefing } from './services/briefingLibrary';

type AppState = 'setup' | 'input' | 'generating' | 'content' | 'library';

function App() {
  return <AppMain />;
}

function AppMain() {
  const [appState, setAppState] = useState<AppState>('setup');
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
    audioStartSectionIndex,
    diveSelection,
    parentSnapshot,
    generateContent,
    reset: resetGeneration,
    loadFromLibrary,
    deepDive,
    exitDive,
    updateCardAnalogy,
    reframeAudio,
    clearAudioStartSection,
  } = useContentGeneration();
  const { session, billing, isAuthenticated, loading: managedLoading, refreshBilling, signOut } = useManaged();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Construct the AudioBriefing from current state. Memoized on the IDs
  // that should trigger a useAudioPlayback reload (deck change OR audio
  // reframe). We pass briefing_id = flashcards.id to keep briefingLibrary
  // lookups stable and audioScript.id is passed separately to drive blob
  // cache invalidation on reframe.
  const briefing: AudioBriefing | null = useMemo(() => {
    if (!flashcards || !audioScript) return null;
    return {
      briefing_id: flashcards.id,
      title: audioScript.title || flashcards.title || 'Audio Briefing',
      source: '',
      created_at: new Date().toISOString(),
      script: audioScript.content,
      audio_file: undefined,
      sections: audioScript.sections.map(s => ({ id: s.id, content: s.content, heading: s.heading })),
      interruptionPoints: audioScript.interruptionPoints,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcards?.id, audioScript?.id]);

  // Audio playback state — owns sectionIndex, pendingCard, blob cache,
  // play/pause, etc. Lifted to App so the persistent orb (centered above)
  // and the ContentBand (right of orb) read the same state.
  const audio = useAudioPlayback({
    briefing,
    cards: flashcards?.cards ?? [],
    audioScriptId: audioScript?.id,
    initialSectionIndex: audioStartSectionIndex,
    onInitialSectionConsumed: clearAudioStartSection,
  });

  // Handle Stripe redirect params (after adding payment method)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success' || params.get('credits') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      refreshBilling();
    }
  }, [refreshBilling]);

  // Auto-transition based on the generation state machine. 'diving' /
  // 'reframing' deliberately don't flip to 'generating' anymore — the orb
  // shows Loading + the DiveOverlay materialises beside it. Initial
  // generation does flip to 'generating' so the GeneratingBand renders
  // its stage list beside the orb.
  const lastSavedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (stage === 'complete' && flashcards && audioScript) {
      setAppState('content');
      refreshBilling();
      // Skip auto-save for dives (transient sub-views; we don't want a
      // half-dozen "Stoicism: dichotomy" entries cluttering the library).
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

  const handleGenerateContent = async (input: { url?: string; text?: string; type: 'url' | 'text' }) => {
    setAppState('generating');
    await generateContent(input);
  };
  const handleNavigateHome = () => setAppState('input');
  const handleNavigateContent = () => {
    if (flashcards && audioScript) setAppState('content');
  };
  const handleNavigateLibrary = () => setAppState('library');
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
    resetGeneration();
    setAppState('setup');
  };
  const handleAddPaymentMethod = () => setShowPaymentModal(true);

  // ── Determine the visible state ─────────────────────────────────────
  // Single managed path now: not authed → show sign-in. Authed → app.
  let currentState = appState;
  if (!isAuthenticated && !managedLoading) {
    currentState = 'setup';
  } else if (currentState === 'setup' && isAuthenticated) {
    currentState = 'input';
  }

  const showHeader = isAuthenticated && currentState !== 'setup';
  const hasContent = !!(flashcards && audioScript);

  // ── Derive orb props for the persistent SolarFlare ──────────────────
  // Priority: dive loading > generating > playback state > idle.
  const isLoadingStage = stage === 'fetching' || stage === 'analyzing' ||
    stage === 'flashcards' || stage === 'audio' || stage === 'diving' || stage === 'reframing';

  const flareState: FlareState =
    isLoadingStage ? 'Loading' :
    currentState === 'content' ? audio.flareState :
    'Idle';

  const ringProgress =
    isLoadingStage ? progress / 100 :
    currentState === 'content' ? audio.ringProgress :
    0;

  // Caption text — instrument-readout style. Always lowercase, calm.
  const orbCaption = (() => {
    if (currentState === 'setup') return 'welcome to basecamp';
    if (currentState === 'input') return 'ready · paste a topic';
    if (stage === 'diving') return diveSelection ? `diving into "${diveSelection}"…` : 'diving deeper…';
    if (stage === 'reframing') return 're-framing analogy…';
    if (isLoadingStage) return `${stage} · ${Math.round(progress)}%`;
    if (currentState === 'library') return `library · ${briefingLibrary.count()} saved`;
    if (currentState === 'content' && hasContent) {
      if (audio.pendingCard) return 'recall time';
      if (audio.hasSections) {
        const cur = Math.min(audio.sectionIndex + 1, audio.sectionCount);
        return `section ${cur} of ${audio.sectionCount} · ${audio.statusLabel}`;
      }
      return audio.statusLabel;
    }
    return undefined;
  })();

  // Click the orb → playable in content state, otherwise no-op.
  const handleOrbToggle = () => {
    if (currentState === 'content' && audio.hasSections && !isLoadingStage) {
      audio.handlePlayPause();
    }
  };
  const orbDisabled = isLoadingStage || (currentState === 'content' ? !!audio.pendingCard || audio.isFetchingAudio : true);

  return (
    <AppShell>
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

      <main
        className={`${showHeader ? 'pt-10' : 'pt-4'} pb-12 px-4 min-h-screen flex flex-col items-center`}
      >
        {/* Vertical stack — orb true-centered horizontally, ~25vh from
            top, content beneath. Same layout on mobile + desktop, just
            the orb shrinks responsively (handled in OrbStage). */}
        <div className="w-full flex flex-col items-center gap-10 mt-[12vh]">
          {/* Persistent JARVIS centerpiece — never unmounts. */}
          <OrbStage
            state={flareState}
            progress={ringProgress}
            caption={orbCaption}
            inDive={!!parentSnapshot}
            sectionMarks={currentState === 'content' && audio.hasSections ? audio.sectionCount : undefined}
            onToggle={handleOrbToggle}
            disabled={orbDisabled}
          />

          {/* Context band — state-driven content panel. AnimatePresence
              cross-fades on state change without unmounting the orb. */}
          <div className="relative w-full max-w-2xl px-2 min-h-[200px]">
            <AnimatePresence mode="wait" initial={false}>
              {currentState === 'setup' && <SignInBand key="sign-in" />}

              {currentState === 'input' && (
                <TopicInputBand
                  key="topic"
                  onGenerate={handleGenerateContent}
                  isGenerating={appState === 'generating'}
                />
              )}

              {currentState === 'generating' && (
                <GeneratingBand
                  key="generating"
                  stage={stage}
                  progress={progress}
                  error={error}
                  insufficientCredits={insufficientCredits}
                  onRetry={handleBackToInput}
                  onAddCredits={handleAddPaymentMethod}
                />
              )}

              {currentState === 'content' && flashcards && audioScript && (
                <ContentBand
                  key="content"
                  flashcards={flashcards}
                  audioScript={audioScript}
                  originalContent={originalContent ?? ''}
                  isInDive={isInDive}
                  isReframing={stage === 'reframing'}
                  sectionIndex={audio.sectionIndex}
                  showScript={audio.showScript}
                  setShowScript={audio.setShowScript}
                  voiceError={audio.voiceError}
                  setVoiceError={audio.setVoiceError}
                  pendingCard={audio.pendingCard}
                  cardRevealed={audio.cardRevealed}
                  setCardRevealed={audio.setCardRevealed}
                  onCardVerdict={audio.handleCardVerdict}
                  onDeepDive={deepDive}
                  onExitDive={exitDive}
                  onAnalogyUpdated={updateCardAnalogy}
                  onReframeAudio={reframeAudio}
                  onBack={handleNavigateHome}
                />
              )}

              {currentState === 'library' && (
                <LibraryBand
                  key="library"
                  onOpen={handleOpenFromLibrary}
                  onBack={handleNavigateHome}
                />
              )}
            </AnimatePresence>

            {/* Dive overlay — rises in the band's column when parentSnapshot
                is set. Sibling of the band so they share the same layout
                slot; AnimatePresence handles enter/exit. */}
            <AnimatePresence>
              {parentSnapshot && stage === 'diving' && (
                <DiveOverlay key="dive-loader" onClose={exitDive}>
                  <DiveLoader selection={diveSelection ?? ''} />
                </DiveOverlay>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {showPaymentModal && (
        <AddPaymentModal onClose={() => setShowPaymentModal(false)} />
      )}
    </AppShell>
  );
}

export default App;
