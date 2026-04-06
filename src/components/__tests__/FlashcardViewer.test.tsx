import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { FlashcardViewer } from '../FlashcardViewer';
import type { FlashcardDeck } from '../../types';

// Mock hooks
const mockUseFlashcardSession = {
  session: {
    deckId: 'test-deck',
    currentCardIndex: 0,
    gotItCount: 0,
    reviewAgainCount: 0,
    completedCards: new Set<string>(),
    reviewAgainCards: new Set<string>()
  },
  currentCard: {
    id: 'card-1',
    question: 'What is React?',
    answer: 'A JavaScript library for building user interfaces.'
  },
  currentCardIndex: 0,
  showAnswer: false,
  isFirstCard: true,
  isLastCard: false,
  nextCard: vi.fn(),
  previousCard: vi.fn(),
  markGotIt: vi.fn(),
  markReviewAgain: vi.fn(),
  toggleAnswer: vi.fn(),
  resetSession: vi.fn()
};

const mockUseTTS = {
  ttsState: {
    isReading: false,
    voiceSettings: {
      personality: 'standard',
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8,
      systemVoice: undefined
    },
    availableVoices: [] as SpeechSynthesisVoice[]
  },
  speakFlashcard: vi.fn(),
  stop: vi.fn()
};

vi.mock('../../hooks/useFlashcards', () => ({
  useFlashcardSession: () => mockUseFlashcardSession
}));

vi.mock('../../hooks/useTTS', () => ({
  useTTS: () => mockUseTTS
}));

// Mock VoiceSettings component
vi.mock('../VoiceSettings', () => ({
  VoiceSettings: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="voice-settings-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  )
}));

describe('FlashcardViewer', () => {
  const mockOnBack = vi.fn();
  
  const sampleDeck: FlashcardDeck = {
    deck_id: 'test-deck',
    title: 'Test Deck',
    source: 'https://example.com/test',
    created_at: '2024-01-01T00:00:00Z',
    cards: [
      {
        id: 'card-1',
        question: 'What is React?',
        answer: 'A JavaScript library for building user interfaces.'
      },
      {
        id: 'card-2',
        question: 'What is TypeScript?',
        answer: 'A typed superset of JavaScript.'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFlashcardSession.session = {
      deckId: 'test-deck',
      currentCardIndex: 0,
      gotItCount: 0,
      reviewAgainCount: 0,
      completedCards: new Set(),
      reviewAgainCards: new Set()
    };
    mockUseFlashcardSession.currentCard = {
      id: 'card-1',
      question: 'What is React?',
      answer: 'A JavaScript library for building user interfaces.'
    };
    mockUseFlashcardSession.showAnswer = false;
    mockUseFlashcardSession.isFirstCard = true;
    mockUseFlashcardSession.isLastCard = false;
    mockUseTTS.ttsState.isReading = false;
  });

  describe('TTS integration in question view', () => {
    it('should show voice settings button in header', () => {
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const voiceSettingsButton = screen.getByTitle('Voice Settings');
      expect(voiceSettingsButton).toBeInTheDocument();
    });

    it('should open voice settings modal when settings button is clicked', async () => {
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const voiceSettingsButton = screen.getByTitle('Voice Settings');
      await user.click(voiceSettingsButton);

      expect(screen.getByTestId('voice-settings-modal')).toBeInTheDocument();
    });

    it('should show read question button in question view', () => {
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const readQuestionButton = screen.getByRole('button', { name: /read question/i });
      expect(readQuestionButton).toBeInTheDocument();
    });

    it('should call speakFlashcard with question only when read question is clicked', async () => {
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const readQuestionButton = screen.getByRole('button', { name: /read question/i });
      await user.click(readQuestionButton);

      expect(mockUseTTS.speakFlashcard).toHaveBeenCalledWith(
        'What is React?',
        'A JavaScript library for building user interfaces.',
        false
      );
    });

    it('should show speaking status when TTS is reading', () => {
      mockUseTTS.ttsState.isReading = true;
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      expect(screen.getByText('Speaking...')).toBeInTheDocument();
    });

    it('should disable read button when TTS is reading', () => {
      mockUseTTS.ttsState.isReading = true;
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const readQuestionButton = screen.getByRole('button', { name: /speaking/i });
      expect(readQuestionButton).toBeDisabled();
    });

    it('should not trigger TTS when clicking elsewhere on card', async () => {
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const questionText = screen.getByText('What is React?');
      await user.click(questionText);

      expect(mockUseTTS.speakFlashcard).not.toHaveBeenCalled();
      expect(mockUseFlashcardSession.toggleAnswer).toHaveBeenCalled();
    });
  });

  describe('TTS integration in answer view', () => {
    beforeEach(() => {
      mockUseFlashcardSession.showAnswer = true;
    });

    it('should show multiple TTS buttons in answer view', () => {
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      expect(screen.getByRole('button', { name: /q/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /a/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /both/i })).toBeInTheDocument();
    });

    it('should read question when Q button is clicked', async () => {
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const qButton = screen.getByRole('button', { name: /q/i });
      await user.click(qButton);

      expect(mockUseTTS.speakFlashcard).toHaveBeenCalledWith(
        'What is React?',
        'A JavaScript library for building user interfaces.',
        false
      );
    });

    it('should read answer when A button is clicked', async () => {
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const aButton = screen.getByRole('button', { name: /a/i });
      await user.click(aButton);

      expect(mockUseTTS.speakFlashcard).toHaveBeenCalledWith(
        'A JavaScript library for building user interfaces.',
        'A JavaScript library for building user interfaces.',
        false
      );
    });

    it('should read both question and answer when Both button is clicked', async () => {
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const bothButton = screen.getByRole('button', { name: /both/i });
      await user.click(bothButton);

      expect(mockUseTTS.speakFlashcard).toHaveBeenCalledWith(
        'What is React?',
        'A JavaScript library for building user interfaces.',
        true
      );
    });

    it('should disable all TTS buttons when reading', () => {
      mockUseTTS.ttsState.isReading = true;
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      expect(screen.getByRole('button', { name: /q/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /a/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /both/i })).toBeDisabled();
    });

    it('should show different colors for different TTS buttons', () => {
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const qButton = screen.getByRole('button', { name: /q/i });
      const aButton = screen.getByRole('button', { name: /a/i });
      const bothButton = screen.getByRole('button', { name: /both/i });

      expect(qButton).toHaveClass('text-blue-400');
      expect(aButton).toHaveClass('text-green-400');
      expect(bothButton).toHaveClass('text-purple-400');
    });
  });

  describe('TTS status indicator', () => {
    it('should show TTS status indicator when reading', () => {
      mockUseTTS.ttsState.isReading = true;
      mockUseTTS.ttsState.voiceSettings.personality = 'standard';
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      expect(screen.getByText('Reading with standard voice')).toBeInTheDocument();
    });

    it('should show Peter Griffin emoji in status when personality is selected', () => {
      mockUseTTS.ttsState.isReading = true;
      mockUseTTS.ttsState.voiceSettings.personality = 'peter-griffin';
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      expect(screen.getByText(/Reading with peter griffin voice 🍺/)).toBeInTheDocument();
    });

    it('should not show status indicator when not reading', () => {
      mockUseTTS.ttsState.isReading = false;
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      expect(screen.queryByText(/Reading with/)).not.toBeInTheDocument();
    });
  });

  describe('TTS integration with navigation controls', () => {
    it('should show stop button when TTS is reading', () => {
      mockUseTTS.ttsState.isReading = true;
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const stopButton = screen.getByRole('button', { name: /stop/i });
      expect(stopButton).toBeInTheDocument();
    });

    it('should stop TTS when stop button is clicked', async () => {
      mockUseTTS.ttsState.isReading = true;
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const stopButton = screen.getByRole('button', { name: /stop/i });
      await user.click(stopButton);

      expect(mockUseTTS.stop).toHaveBeenCalled();
    });

    it('should stop TTS when marking card as got it', async () => {
      mockUseFlashcardSession.showAnswer = true;
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const gotItButton = screen.getByRole('button', { name: /got it/i });
      await user.click(gotItButton);

      expect(mockUseTTS.stop).toHaveBeenCalled();
      expect(mockUseFlashcardSession.markGotIt).toHaveBeenCalled();
    });

    it('should stop TTS when marking card for review', async () => {
      mockUseFlashcardSession.showAnswer = true;
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const reviewButton = screen.getByRole('button', { name: /review again/i });
      await user.click(reviewButton);

      expect(mockUseTTS.stop).toHaveBeenCalled();
      expect(mockUseFlashcardSession.markReviewAgain).toHaveBeenCalled();
    });

    it('should stop TTS when swiping to next card', () => {
      mockUseFlashcardSession.showAnswer = true;
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const cardElement = screen.getByText('What is React?').closest('.card-flip');
      expect(cardElement).toBeInTheDocument();

      // Simulate swipe gesture
      fireEvent.touchStart(cardElement!, {
        targetTouches: [{ clientX: 100 }]
      });
      fireEvent.touchMove(cardElement!, {
        targetTouches: [{ clientX: 50 }]
      });
      fireEvent.touchEnd(cardElement!);

      expect(mockUseTTS.stop).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing session gracefully', () => {
      mockUseFlashcardSession.session = null;
      mockUseFlashcardSession.currentCard = null;

      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      expect(screen.getByText('Failed to load flashcard session')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /read question/i })).not.toBeInTheDocument();
    });

    it('should prevent event propagation when TTS buttons are clicked', async () => {
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const readQuestionButton = screen.getByRole('button', { name: /read question/i });
      await user.click(readQuestionButton);

      // Toggle answer should not be called when TTS button is clicked
      expect(mockUseFlashcardSession.toggleAnswer).not.toHaveBeenCalled();
      expect(mockUseTTS.speakFlashcard).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have accessible labels for TTS controls', () => {
      mockUseFlashcardSession.showAnswer = true;
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const qButton = screen.getByRole('button', { name: /q/i });
      const aButton = screen.getByRole('button', { name: /a/i });
      const bothButton = screen.getByRole('button', { name: /both/i });

      expect(qButton).toBeInTheDocument();
      expect(aButton).toBeInTheDocument();
      expect(bothButton).toBeInTheDocument();
    });

    it('should provide clear visual feedback for TTS state', () => {
      mockUseTTS.ttsState.isReading = true;
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const statusIndicator = screen.getByText(/Reading with/);
      expect(statusIndicator).toHaveClass('bg-blue-600/90');
    });

    it('should support keyboard navigation for TTS controls', async () => {
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const readButton = screen.getByRole('button', { name: /read question/i });
      
      // Focus should be possible
      readButton.focus();
      expect(readButton).toHaveFocus();

      // Enter key should trigger action
      await user.keyboard('{Enter}');
      expect(mockUseTTS.speakFlashcard).toHaveBeenCalled();
    });
  });

  describe('integration with deck state', () => {
    it('should display deck title and progress', () => {
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      expect(screen.getByText('Test Deck')).toBeInTheDocument();
      expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('should handle session stats properly', () => {
      mockUseFlashcardSession.session!.gotItCount = 3;
      mockUseFlashcardSession.session!.reviewAgainCount = 1;
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      expect(screen.getByText('3')).toBeInTheDocument(); // Got it count
      expect(screen.getByText('1')).toBeInTheDocument(); // Review count
    });

    it('should reset session when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<FlashcardViewer deck={sampleDeck} onBack={mockOnBack} />);

      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      expect(mockUseFlashcardSession.resetSession).toHaveBeenCalled();
    });
  });
});