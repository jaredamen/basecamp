import { useState } from 'react';
import type { FlashcardSet } from '../services/aiPrompting';

interface FlashcardDisplayProps {
  flashcardSet: FlashcardSet;
  onComplete?: () => void;
}

export function FlashcardDisplay({ flashcardSet, onComplete }: FlashcardDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = flashcardSet.cards[currentIndex];
  const isLastCard = currentIndex === flashcardSet.cards.length - 1;
  const progress = ((currentIndex + 1) / flashcardSet.cards.length) * 100;

  const handleNext = () => {
    if (isLastCard && onComplete) {
      onComplete();
    } else {
      setCurrentIndex(prev => Math.min(prev + 1, flashcardSet.cards.length - 1));
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
    setIsFlipped(false);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          {onComplete && (
            <button
              onClick={onComplete}
              className="inline-flex items-center text-dark-400 hover:text-dark-200 transition-colors text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to overview
            </button>
          )}
          <h1 className="text-3xl font-bold text-white">{flashcardSet.title}</h1>
          <p className="text-dark-300">{flashcardSet.description}</p>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-dark-400 mb-2">
              <span>Card {currentIndex + 1} of {flashcardSet.cards.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Flashcard */}
        <div
          onClick={handleFlip}
          className="bg-dark-800/50 border border-dark-700 rounded-xl p-8 min-h-[400px] cursor-pointer hover:border-dark-600 transition-all"
        >
          {!isFlipped ? (
            /* Front Side — Question */
            <div className="flex flex-col justify-between h-full min-h-[350px]">
              <div className="space-y-4">
                <div className="text-sm text-dark-400 text-right">
                  Tap to reveal answer
                </div>
                <div className="text-xl font-medium text-white leading-relaxed">
                  {currentCard.front}
                </div>
              </div>
              <div className="text-center pt-8">
                <div className="text-5xl text-dark-600 opacity-30">?</div>
              </div>
            </div>
          ) : (
            /* Back Side — Answer */
            <div className="space-y-4">
              <div className="text-sm text-green-400 text-right">
                Answer
              </div>

              <div className="text-lg text-white font-medium leading-relaxed">
                {currentCard.back}
              </div>

              {currentCard.explanation && (
                <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">Remember it like this:</h4>
                  <p className="text-dark-200 text-sm leading-relaxed">
                    {currentCard.explanation}
                  </p>
                </div>
              )}

              {currentCard.codeExample && (
                <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-600">
                  <h4 className="text-sm font-medium text-green-300 mb-2">Code Example</h4>
                  <pre className="text-xs text-gray-300 overflow-x-auto">
                    <code>{currentCard.codeExample}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-6 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 disabled:bg-dark-800 disabled:text-dark-500 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <button
            onClick={handleFlip}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isFlipped ? 'Flip to Question' : 'Show Answer'}
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isLastCard ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
