import React, { useState, useRef } from 'react';
import type { FlashcardDeck } from '../types';
import { useFlashcardSession } from '../hooks/useFlashcards';

interface FlashcardViewerProps {
  deck: FlashcardDeck;
  onBack: () => void;
}

const ArrowBackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ThumbsUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
  </svg>
);

const ThumbsDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M15.73 5.25h1.035A7.465 7.465 0 0118 9.375a7.465 7.465 0 01-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75 2.25 2.25 0 01-2.25-2.25c0-1.152.26-2.243.723-3.218C7.74 15.724 7.366 14.9 6.26 14.9H3.126c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 011 11.25c0-2.357.653-4.57 1.789-6.521C3.277 3.836 4.297 3.25 5.385 3.25h6.344c.483 0 .964.078 1.423.23l3.114 1.04a4.501 4.501 0 001.423.23h.777zM21.25 18.75h-.908a.75.75 0 01-.75-.75v-4.5c0-.414.336-.75.75-.75h.908c.889 0 1.713-.518 1.972-1.368a12 12 0 00.521-3.507c0-1.553-.295-3.036-.831-4.398C22.689 2.451 21.909 2 21.077 2H20.25a.75.75 0 01-.75-.75V.75a.75.75 0 01.75-.75h.827c1.159 0 2.24.585 2.808 1.521 1.136 1.952 1.789 4.164 1.789 6.521 0 1.553-.295 3.036-.831 4.398-.305.774-1.086 1.227-1.918 1.227z"/>
  </svg>
);

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ deck, onBack }) => {
  const {
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
  } = useFlashcardSession(deck);

  const cardRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchEnd, setTouchEnd] = useState<number>(0);

  if (!currentCard || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-dark-400">Failed to load flashcard session</p>
          <button onClick={onBack} className="mt-4 text-blue-400 hover:text-blue-300">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isRightSwipe && showAnswer) {
      markGotIt();
      if (!isLastCard) nextCard();
    } else if (isLeftSwipe && showAnswer) {
      markReviewAgain();
      if (!isLastCard) nextCard();
    }
  };

  const progress = ((currentCardIndex + 1) / deck.cards.length) * 100;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-dark-800 px-4 py-3 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowBackIcon className="w-5 h-5 mr-1" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-dark-100 truncate max-w-48">
              {deck.title}
            </h2>
            <p className="text-xs text-dark-400">
              {currentCardIndex + 1} of {deck.cards.length}
            </p>
          </div>
          <button
            onClick={resetSession}
            className="text-xs text-dark-400 hover:text-dark-200 px-2 py-1 rounded border border-dark-600 hover:border-dark-500"
          >
            Reset
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 bg-dark-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="bg-dark-800 px-4 py-2 border-b border-dark-700">
        <div className="flex justify-center space-x-6 text-sm">
          <div className="text-center">
            <div className="text-green-400 font-semibold">{session.gotItCount}</div>
            <div className="text-dark-400">Got it</div>
          </div>
          <div className="text-center">
            <div className="text-orange-400 font-semibold">{session.reviewAgainCount}</div>
            <div className="text-dark-400">Review</div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          ref={cardRef}
          className={`relative w-full max-w-md h-80 card-flip ${showAnswer ? 'flipped' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={toggleAnswer}
        >
          {/* Front of card (question) */}
          <div className="card-front bg-dark-800 rounded-xl p-6 border border-dark-600 cursor-pointer hover:bg-dark-750 transition-colors">
            <div className="flex flex-col justify-center h-full">
              <div className="text-center mb-4">
                <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                  QUESTION
                </span>
              </div>
              <p className="text-lg text-dark-100 text-center leading-relaxed">
                {currentCard.question}
              </p>
              <div className="text-center mt-6">
                <p className="text-xs text-dark-500">Tap to reveal answer</p>
              </div>
            </div>
          </div>

          {/* Back of card (answer) */}
          <div className="card-back bg-dark-800 rounded-xl p-6 border border-dark-600 cursor-pointer hover:bg-dark-750 transition-colors">
            <div className="flex flex-col justify-center h-full">
              <div className="text-center mb-4">
                <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                  ANSWER
                </span>
              </div>
              <p className="text-lg text-dark-100 text-center leading-relaxed">
                {currentCard.answer}
              </p>
              <div className="text-center mt-6">
                <p className="text-xs text-dark-500">Swipe or use buttons below</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 pb-20 bg-dark-800 border-t border-dark-700">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={previousCard}
            disabled={isFirstCard}
            className={`flex items-center px-3 py-2 rounded-lg ${
              isFirstCard 
                ? 'text-dark-600 cursor-not-allowed' 
                : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700'
            } transition-colors`}
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1" />
            <span className="text-sm">Previous</span>
          </button>

          <button
            onClick={toggleAnswer}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </button>

          <button
            onClick={nextCard}
            disabled={isLastCard}
            className={`flex items-center px-3 py-2 rounded-lg ${
              isLastCard 
                ? 'text-dark-600 cursor-not-allowed' 
                : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700'
            } transition-colors`}
          >
            <span className="text-sm">Next</span>
            <ChevronRightIcon className="w-5 h-5 ml-1" />
          </button>
        </div>

        {/* Rating buttons (only show when answer is visible) */}
        {showAnswer && (
          <div className="flex space-x-3">
            <button
              onClick={() => {
                markReviewAgain();
                if (!isLastCard) nextCard();
              }}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-orange-600/20 border border-orange-600/30 text-orange-400 rounded-lg hover:bg-orange-600/30 transition-colors"
            >
              <ThumbsDownIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Review Again</span>
            </button>

            <button
              onClick={() => {
                markGotIt();
                if (!isLastCard) nextCard();
              }}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600/20 border border-green-600/30 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
            >
              <ThumbsUpIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Got It</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};