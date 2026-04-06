import { useState, useEffect } from 'react';
import type { FlashcardDeck, FlashcardSession } from '../types';
import createDataLoader from '../data/loader';

export const useFlashcards = () => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadDecks = async () => {
    try {
      setLoading(true);
      setError(null);
      const dataLoader = createDataLoader();
      const loadedDecks = await dataLoader.loadFlashcardDecks();
      setDecks(loadedDecks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const addDeck = (newDeck: FlashcardDeck) => {
    setDecks(prev => [...prev, newDeck]);
  };

  const addDecks = (newDecks: FlashcardDeck[]) => {
    setDecks(prev => [...prev, ...newDecks]);
  };

  return {
    decks,
    loading,
    error,
    reload: loadDecks,
    addDeck,
    addDecks
  };
};

export const useFlashcardSession = (deck: FlashcardDeck | null) => {
  const [session, setSession] = useState<FlashcardSession | null>(() =>
    deck ? {
      deckId: deck.deck_id,
      currentCardIndex: 0,
      gotItCount: 0,
      reviewAgainCount: 0,
      completedCards: new Set<string>(),
      reviewAgainCards: new Set<string>()
    } : null
  );
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (deck) {
      const newSession: FlashcardSession = {
        deckId: deck.deck_id,
        currentCardIndex: 0,
        gotItCount: 0,
        reviewAgainCount: 0,
        completedCards: new Set<string>(),
        reviewAgainCards: new Set<string>()
      };
      
      setSession(newSession);
      setCurrentCardIndex(0);
      setShowAnswer(false);
    } else {
      setSession(null);
    }
  }, [deck]); // Include full deck to handle changes properly

  const nextCard = () => {
    if (!deck || !session) return;
    
    const nextIndex = currentCardIndex + 1;
    if (nextIndex < deck.cards.length) {
      setCurrentCardIndex(nextIndex);
      setShowAnswer(false);
      setSession(prev => prev ? { ...prev, currentCardIndex: nextIndex } : null);
    }
  };

  const previousCard = () => {
    if (!deck || !session) return;
    
    const prevIndex = currentCardIndex - 1;
    if (prevIndex >= 0) {
      setCurrentCardIndex(prevIndex);
      setShowAnswer(false);
      setSession(prev => prev ? { ...prev, currentCardIndex: prevIndex } : null);
    }
  };

  const markGotIt = () => {
    if (!deck || !session) return;
    
    const currentCard = deck.cards[currentCardIndex];
    const wasReviewAgain = session.reviewAgainCards.has(currentCard.id);
    
    setSession(prev => {
      if (!prev) return null;
      
      const newCompletedCards = new Set(prev.completedCards);
      const newReviewAgainCards = new Set(prev.reviewAgainCards);
      
      newCompletedCards.add(currentCard.id);
      newReviewAgainCards.delete(currentCard.id);
      
      return {
        ...prev,
        completedCards: newCompletedCards,
        reviewAgainCards: newReviewAgainCards,
        gotItCount: prev.gotItCount + (wasReviewAgain ? 0 : 1),
        reviewAgainCount: prev.reviewAgainCount - (wasReviewAgain ? 1 : 0)
      };
    });
  };

  const markReviewAgain = () => {
    if (!deck || !session) return;
    
    const currentCard = deck.cards[currentCardIndex];
    const wasCompleted = session.completedCards.has(currentCard.id);
    
    setSession(prev => {
      if (!prev) return null;
      
      const newCompletedCards = new Set(prev.completedCards);
      const newReviewAgainCards = new Set(prev.reviewAgainCards);
      
      newReviewAgainCards.add(currentCard.id);
      newCompletedCards.delete(currentCard.id);
      
      return {
        ...prev,
        completedCards: newCompletedCards,
        reviewAgainCards: newReviewAgainCards,
        reviewAgainCount: prev.reviewAgainCount + (wasCompleted ? 0 : 1),
        gotItCount: prev.gotItCount - (wasCompleted ? 1 : 0)
      };
    });
  };

  const toggleAnswer = () => {
    setShowAnswer(prev => !prev);
  };

  const resetSession = () => {
    if (deck) {
      setSession({
        deckId: deck.deck_id,
        currentCardIndex: 0,
        gotItCount: 0,
        reviewAgainCount: 0,
        completedCards: new Set(),
        reviewAgainCards: new Set()
      });
      setCurrentCardIndex(0);
      setShowAnswer(false);
    }
  };

  const currentCard = deck?.cards[currentCardIndex] || null;
  const isFirstCard = currentCardIndex === 0;
  const isLastCard = deck ? currentCardIndex === deck.cards.length - 1 : true;

  return {
    session,
    currentCard,
    currentCardIndex,
    showAnswer,
    isFirstCard,
    isLastCard,
    nextCard,
    previousCard,
    markGotIt,
    markReviewAgain,
    toggleAnswer,
    resetSession
  };
};