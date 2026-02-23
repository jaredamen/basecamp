import React from 'react';
import type { FlashcardDeck as FlashcardDeckType } from '../types';
import { FileImport } from './FileImport';

interface FlashcardDeckProps {
  decks: FlashcardDeckType[];
  loading: boolean;
  onDeckSelect: (deck: FlashcardDeckType) => void;
  onImport: (decks: FlashcardDeckType[]) => void;
  onError: (error: string) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  decks,
  loading,
  onDeckSelect,
  onImport,
  onError
}) => {
  const handleImport = (data: FlashcardDeckType[] | any[]) => {
    // Filter to ensure we only get FlashcardDeck items
    const flashcardDecks = data.filter((item): item is FlashcardDeckType => 
      'cards' in item && Array.isArray(item.cards)
    );
    
    if (flashcardDecks.length === 0) {
      onError('No valid flashcard decks found in the imported file');
      return;
    }
    
    onImport(flashcardDecks);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-dark-100 mb-6">Flashcard Decks</h1>
        
        <FileImport onImport={handleImport} onError={onError} />
        
        {decks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-400 text-lg mb-2">No flashcard decks available</p>
            <p className="text-dark-500 text-sm">Import a JSON file to get started</p>
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {decks.map((deck) => (
              <button
                key={deck.deck_id}
                onClick={() => onDeckSelect(deck)}
                className="w-full bg-dark-800 hover:bg-dark-700 rounded-lg p-4 text-left transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-dark-100 mb-1 truncate">
                      {deck.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-dark-400">
                      <span>{deck.cards.length} cards</span>
                      <span>•</span>
                      <span>{formatDate(deck.created_at)}</span>
                    </div>
                    {deck.source && (
                      <p className="text-xs text-dark-500 mt-2 truncate">
                        Source: {new URL(deck.source).hostname}
                      </p>
                    )}
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-dark-400 group-hover:text-dark-200 transition-colors ml-4 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};