import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFlashcardSession } from '../../src/hooks/useFlashcards';
import type { FlashcardDeck } from '../../src/types';

const mockDeck: FlashcardDeck = {
  deck_id: 'test-deck',
  title: 'Test Deck',
  source: 'test',
  created_at: '2025-01-01T00:00:00Z',
  cards: [
    { id: '1', question: 'Question 1', answer: 'Answer 1' },
    { id: '2', question: 'Question 2', answer: 'Answer 2' },
    { id: '3', question: 'Question 3', answer: 'Answer 3' },
  ]
};

describe('useFlashcardSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes session with first card', () => {
    const { result } = renderHook(() => useFlashcardSession(mockDeck));

    expect(result.current.currentCard).toEqual(mockDeck.cards[0]);
    expect(result.current.currentCardIndex).toBe(0);
    expect(result.current.showAnswer).toBe(false);
    expect(result.current.session).toEqual({
      deckId: 'test-deck',
      currentCardIndex: 0,
      gotItCount: 0,
      reviewAgainCount: 0,
      completedCards: new Set(),
      reviewAgainCards: new Set()
    });
  });

  it('navigates to next card', () => {
    const { result } = renderHook(() => useFlashcardSession(mockDeck));

    expect(result.current.currentCardIndex).toBe(0);
    
    result.current.nextCard();
    
    expect(result.current.currentCardIndex).toBe(1);
    expect(result.current.currentCard).toEqual(mockDeck.cards[1]);
    expect(result.current.showAnswer).toBe(false);
  });

  it('navigates to previous card', () => {
    const { result } = renderHook(() => useFlashcardSession(mockDeck));

    // Move to second card first
    result.current.nextCard();
    expect(result.current.currentCardIndex).toBe(1);
    
    // Move back to first card
    result.current.previousCard();
    
    expect(result.current.currentCardIndex).toBe(0);
    expect(result.current.currentCard).toEqual(mockDeck.cards[0]);
  });

  it('toggles answer visibility', () => {
    const { result } = renderHook(() => useFlashcardSession(mockDeck));

    expect(result.current.showAnswer).toBe(false);
    
    result.current.toggleAnswer();
    
    expect(result.current.showAnswer).toBe(true);
    
    result.current.toggleAnswer();
    
    expect(result.current.showAnswer).toBe(false);
  });

  it('marks card as got it', () => {
    const { result } = renderHook(() => useFlashcardSession(mockDeck));

    result.current.markGotIt();

    expect(result.current.session?.gotItCount).toBe(1);
    expect(result.current.session?.reviewAgainCount).toBe(0);
    expect(result.current.session?.completedCards.has('1')).toBe(true);
  });

  it('marks card as review again', () => {
    const { result } = renderHook(() => useFlashcardSession(mockDeck));

    result.current.markReviewAgain();

    expect(result.current.session?.reviewAgainCount).toBe(1);
    expect(result.current.session?.gotItCount).toBe(0);
    expect(result.current.session?.reviewAgainCards.has('1')).toBe(true);
  });

  it('identifies first and last cards correctly', () => {
    const { result } = renderHook(() => useFlashcardSession(mockDeck));

    // First card
    expect(result.current.isFirstCard).toBe(true);
    expect(result.current.isLastCard).toBe(false);

    // Move to middle card
    result.current.nextCard();
    expect(result.current.isFirstCard).toBe(false);
    expect(result.current.isLastCard).toBe(false);

    // Move to last card
    result.current.nextCard();
    expect(result.current.isFirstCard).toBe(false);
    expect(result.current.isLastCard).toBe(true);
  });

  it('resets session correctly', () => {
    const { result } = renderHook(() => useFlashcardSession(mockDeck));

    // Make some progress
    result.current.nextCard();
    result.current.markGotIt();
    result.current.toggleAnswer();

    // Reset
    result.current.resetSession();

    expect(result.current.currentCardIndex).toBe(0);
    expect(result.current.showAnswer).toBe(false);
    expect(result.current.session?.gotItCount).toBe(0);
    expect(result.current.session?.reviewAgainCount).toBe(0);
  });
});