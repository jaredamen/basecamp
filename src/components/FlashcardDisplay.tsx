import { useState } from 'react';
import type { FlashcardSet } from '../services/aiPrompting';

interface FlashcardDisplayProps {
  flashcardSet: FlashcardSet;
  onComplete?: () => void;
}

export function FlashcardDisplay({ flashcardSet, onComplete }: FlashcardDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<'study' | 'review'>('study');

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

  const handleCardSelect = (index: number) => {
    setCurrentIndex(index);
    setIsFlipped(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'hard': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8 px-6">
      <div className="max-w-4xl mx-auto space-y-6">
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

          {/* Study Mode Toggle */}
          <div className="flex justify-center">
            <div className="bg-dark-800/50 rounded-lg p-1 border border-dark-700">
              <button
                onClick={() => setStudyMode('study')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  studyMode === 'study'
                    ? 'bg-blue-600 text-white'
                    : 'text-dark-300 hover:text-white'
                }`}
              >
                Study Mode
              </button>
              <button
                onClick={() => setStudyMode('review')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  studyMode === 'review'
                    ? 'bg-purple-600 text-white'
                    : 'text-dark-300 hover:text-white'
                }`}
              >
                Review Mode
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Flashcard */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              {/* Flashcard — conditional rendering instead of 3D CSS flip */}
              <div
                onClick={handleFlip}
                className="bg-dark-800/50 border border-dark-700 rounded-xl p-8 min-h-[400px] cursor-pointer hover:border-dark-600 transition-all"
              >
                {!isFlipped ? (
                  /* Front Side — Question */
                  <div className="flex flex-col justify-between h-full min-h-[350px]">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(currentCard.difficulty)}`}>
                          {currentCard.difficulty.toUpperCase()}
                        </span>
                        <div className="text-sm text-dark-400">
                          Tap to reveal answer
                        </div>
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
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(currentCard.difficulty)}`}>
                        {currentCard.difficulty.toUpperCase()}
                      </span>
                      <div className="text-sm text-green-400">
                        Answer
                      </div>
                    </div>

                    <div className="text-lg text-white font-medium leading-relaxed">
                      {currentCard.back}
                    </div>

                    {currentCard.explanation && (
                      <div className="bg-dark-700/50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-300 mb-2">Explanation</h4>
                        <p className="text-dark-300 text-sm leading-relaxed">
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

                    {currentCard.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {currentCard.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-dark-600/50 text-dark-300 rounded border border-dark-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="px-6 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 disabled:bg-dark-800 disabled:text-dark-500 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                
                <button
                  onClick={handleFlip}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isFlipped ? '🔄 Flip to Question' : '👁️ Show Answer'}
                </button>
                
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isLastCard ? 'Complete 🎉' : 'Next →'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Card Overview */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Study Session</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Total Cards</span>
                  <span className="text-white">{flashcardSet.cards.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Estimated Time</span>
                  <span className="text-white">{flashcardSet.metadata.estimatedTime}min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Difficulty</span>
                  <span className="text-white capitalize">{flashcardSet.metadata.difficulty}</span>
                </div>
              </div>
            </div>

            {/* Card List */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Quick Navigation</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {flashcardSet.cards.map((card, index) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardSelect(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      index === currentIndex
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                        : 'border-dark-600 bg-dark-700/50 text-dark-300 hover:border-dark-500 hover:text-dark-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Card {index + 1}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getDifficultyColor(card.difficulty)}`}>
                        {card.difficulty[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm truncate">
                      {card.front.length > 40 ? card.front.substring(0, 40) + '...' : card.front}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topics */}
            {flashcardSet.metadata.topics.length > 0 && (
              <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3">Topics Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {flashcardSet.metadata.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-purple-600/20 text-purple-300 rounded border border-purple-600/30"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}