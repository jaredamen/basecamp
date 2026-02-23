import React, { useState } from 'react';
import type { TabType, FlashcardDeck, AudioBriefing } from './types';
import { BottomNav } from './components/BottomNav';
import { FlashcardDeck as FlashcardDeckComponent } from './components/FlashcardDeck';
import { FlashcardViewer } from './components/FlashcardViewer';
import { AudioFeed } from './components/AudioFeed';
import { AudioPlayer } from './components/AudioPlayer';
import { useFlashcards } from './hooks/useFlashcards';
import { useAudioBriefings } from './hooks/useAudioPlayer';
import './styles/globals.css';

type ViewState = 
  | { type: 'flashcard-list' }
  | { type: 'flashcard-viewer'; deck: FlashcardDeck }
  | { type: 'audio-list' }
  | { type: 'audio-player'; briefing: AudioBriefing };

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('flashcards');
  const [viewState, setViewState] = useState<ViewState>({ type: 'flashcard-list' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { 
    decks, 
    loading: decksLoading, 
    error: decksError, 
    addDecks 
  } = useFlashcards();

  const { 
    briefings, 
    loading: briefingsLoading, 
    error: briefingsError, 
    addBriefings 
  } = useAudioBriefings();

  React.useEffect(() => {
    // Update view state when tab changes
    if (activeTab === 'flashcards' && viewState.type.startsWith('audio')) {
      setViewState({ type: 'flashcard-list' });
    } else if (activeTab === 'audio' && viewState.type.startsWith('flashcard')) {
      setViewState({ type: 'audio-list' });
    }
  }, [activeTab, viewState.type]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeckSelect = (deck: FlashcardDeck) => {
    setViewState({ type: 'flashcard-viewer', deck });
  };

  const handleBriefingSelect = (briefing: AudioBriefing) => {
    setViewState({ type: 'audio-player', briefing });
  };

  const handleBackToFlashcardList = () => {
    setViewState({ type: 'flashcard-list' });
  };

  const handleBackToAudioList = () => {
    setViewState({ type: 'audio-list' });
  };

  const handleFlashcardImport = (importedDecks: FlashcardDeck[]) => {
    addDecks(importedDecks);
    showToast(`Imported ${importedDecks.length} flashcard deck(s)`, 'success');
  };

  const handleAudioImport = (importedBriefings: AudioBriefing[]) => {
    addBriefings(importedBriefings);
    showToast(`Imported ${importedBriefings.length} audio briefing(s)`, 'success');
  };

  const handleError = (error: string) => {
    showToast(error, 'error');
  };

  const renderContent = () => {
    switch (viewState.type) {
      case 'flashcard-list':
        return (
          <FlashcardDeckComponent
            decks={decks}
            loading={decksLoading}
            onDeckSelect={handleDeckSelect}
            onImport={handleFlashcardImport}
            onError={handleError}
          />
        );
      
      case 'flashcard-viewer':
        return (
          <FlashcardViewer
            deck={viewState.deck}
            onBack={handleBackToFlashcardList}
          />
        );
      
      case 'audio-list':
        return (
          <AudioFeed
            briefings={briefings}
            loading={briefingsLoading}
            onBriefingSelect={handleBriefingSelect}
            onImport={handleAudioImport}
            onError={handleError}
          />
        );
      
      case 'audio-player':
        return (
          <AudioPlayer
            briefing={viewState.briefing}
            onBack={handleBackToAudioList}
          />
        );
      
      default:
        return null;
    }
  };

  // Determine if we should show the bottom nav
  const showBottomNav = viewState.type === 'flashcard-list' || viewState.type === 'audio-list';

  return (
    <div className="h-full flex flex-col bg-dark-900 text-dark-100">
      {renderContent()}
      
      {showBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className={`p-3 rounded-lg shadow-lg transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            <p className="text-sm font-medium text-center">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Error States */}
      {decksError && activeTab === 'flashcards' && (
        <div className="fixed bottom-20 left-4 right-4 bg-red-600/20 border border-red-600/30 text-red-400 p-3 rounded-lg">
          <p className="text-sm text-center">Failed to load flashcard decks</p>
        </div>
      )}
      
      {briefingsError && activeTab === 'audio' && (
        <div className="fixed bottom-20 left-4 right-4 bg-red-600/20 border border-red-600/30 text-red-400 p-3 rounded-lg">
          <p className="text-sm text-center">Failed to load audio briefings</p>
        </div>
      )}
    </div>
  );
}

export default App;