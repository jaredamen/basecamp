import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { VoiceSettings } from '../VoiceSettings';
import type { TTSState } from '../../types';

// Mock the useTTS hook
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
    availableVoices: [
      { name: 'Alex', lang: 'en-US' },
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Daniel', lang: 'en-GB' }
    ] as SpeechSynthesisVoice[]
  } as TTSState,
  updateVoiceSettings: vi.fn(),
  setVoicePersonality: vi.fn(),
  getVoicesByLanguage: vi.fn(() => ({
    'en': [
      { name: 'Alex', lang: 'en-US' },
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Daniel', lang: 'en-GB' }
    ] as SpeechSynthesisVoice[]
  })),
  getRecommendedVoice: vi.fn(() => ({ name: 'Alex', lang: 'en-US' } as SpeechSynthesisVoice)),
  speak: vi.fn(),
  isSupported: true
};

vi.mock('../../hooks/useTTS', () => ({
  useTTS: () => mockUseTTS
}));

describe('VoiceSettings', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTTS.ttsState = {
      isReading: false,
      voiceSettings: {
        personality: 'standard',
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
        systemVoice: undefined
      },
      availableVoices: [
        { name: 'Alex', lang: 'en-US' },
        { name: 'Samantha', lang: 'en-US' },
        { name: 'Daniel', lang: 'en-GB' }
      ] as SpeechSynthesisVoice[]
    } as TTSState;
  });

  describe('rendering', () => {
    it('should not render when closed', () => {
      render(<VoiceSettings isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByText('Voice Settings')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Voice Settings')).toBeInTheDocument();
    });

    it('should show browser support warning when TTS is not supported', () => {
      mockUseTTS.isSupported = false;
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Text-to-speech is not supported in your browser.')).toBeInTheDocument();
    });

    it('should render all voice personality options', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Peter Griffin')).toBeInTheDocument();
      expect(screen.getByText('Motivational')).toBeInTheDocument();
      expect(screen.getByText('Asmr')).toBeInTheDocument();
    });

    it('should show current personality as selected', () => {
      mockUseTTS.ttsState.voiceSettings.personality = 'peter-griffin';
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const peterGriffinButton = screen.getByRole('button', { name: /peter griffin/i });
      expect(peterGriffinButton).toHaveClass('border-blue-500');
    });

    it('should render system voice selection dropdown', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByLabelText('System Voice')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Auto (Recommended)')).toBeInTheDocument();
    });

    it('should render voice control sliders', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Speaking Rate: 1.0x')).toBeInTheDocument();
      expect(screen.getByText('Pitch: 1.0')).toBeInTheDocument();
      expect(screen.getByText('Volume: 80%')).toBeInTheDocument();
    });

    it('should show Peter Griffin special note when personality is selected', () => {
      mockUseTTS.ttsState.voiceSettings.personality = 'peter-griffin';
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText(/Peter Griffin mode activated!/)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should change voice personality when personality button is clicked', async () => {
      const user = userEvent.setup();
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const peterGriffinButton = screen.getByRole('button', { name: /peter griffin/i });
      await user.click(peterGriffinButton);
      
      expect(mockUseTTS.setVoicePersonality).toHaveBeenCalledWith('peter-griffin');
    });

    it('should update system voice when dropdown selection changes', async () => {
      const user = userEvent.setup();
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const voiceSelect = screen.getByLabelText('System Voice');
      await user.selectOptions(voiceSelect, 'Alex');
      
      expect(mockUseTTS.updateVoiceSettings).toHaveBeenCalledWith({ systemVoice: 'Alex' });
    });

    it('should update speaking rate when slider changes', async () => {
      const user = userEvent.setup();
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const rateSlider = screen.getByDisplayValue('1');
      await user.clear(rateSlider);
      await user.type(rateSlider, '1.5');
      
      expect(mockUseTTS.updateVoiceSettings).toHaveBeenCalledWith({ rate: 1.5 });
    });

    it('should update pitch when slider changes', async () => {
      const user = userEvent.setup();
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const pitchSliders = screen.getAllByDisplayValue('1');
      const pitchSlider = pitchSliders[1]; // Second slider is pitch
      await user.clear(pitchSlider);
      await user.type(pitchSlider, '1.2');
      
      expect(mockUseTTS.updateVoiceSettings).toHaveBeenCalledWith({ pitch: 1.2 });
    });

    it('should update volume when slider changes', async () => {
      const user = userEvent.setup();
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const volumeSlider = screen.getByDisplayValue('0.8');
      await user.clear(volumeSlider);
      await user.type(volumeSlider, '0.6');
      
      expect(mockUseTTS.updateVoiceSettings).toHaveBeenCalledWith({ volume: 0.6 });
    });

    it('should test voice when test button is clicked', async () => {
      const user = userEvent.setup();
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const testButton = screen.getByRole('button', { name: /test voice/i });
      await user.click(testButton);
      
      expect(mockUseTTS.speak).toHaveBeenCalledWith(
        'This is how your selected voice sounds.',
        true
      );
    });

    it('should test Peter Griffin voice with appropriate text', async () => {
      mockUseTTS.ttsState.voiceSettings.personality = 'peter-griffin';
      const user = userEvent.setup();
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const testButton = screen.getByRole('button', { name: /test voice/i });
      await user.click(testButton);
      
      expect(mockUseTTS.speak).toHaveBeenCalledWith(
        'Holy crap, this is how I sound!',
        true
      );
    });

    it('should disable test button when TTS is reading', () => {
      mockUseTTS.ttsState.isReading = true;
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const testButton = screen.getByRole('button', { name: /speaking/i });
      expect(testButton).toBeDisabled();
    });

    it('should disable test button when TTS is not supported', () => {
      mockUseTTS.isSupported = false;
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const testButton = screen.getByRole('button', { name: /test voice/i });
      expect(testButton).toBeDisabled();
    });
  });

  describe('voice personality descriptions', () => {
    it('should show correct description for each personality', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Standard clear voice')).toBeInTheDocument();
      expect(screen.getByText('Nyehehehe! Fun voice with catchphrases')).toBeInTheDocument();
      expect(screen.getByText('Energetic and encouraging tone')).toBeInTheDocument();
      expect(screen.getByText('Soft, calming voice for relaxation')).toBeInTheDocument();
    });
  });

  describe('recommended voice display', () => {
    it('should show recommended voice name', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Recommended: Alex')).toBeInTheDocument();
    });

    it('should show fallback text when no recommended voice', () => {
      mockUseTTS.getRecommendedVoice.mockReturnValue(undefined as unknown as SpeechSynthesisVoice);
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Recommended: Default')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('System Voice')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test voice/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /standard/i })).toHaveFocus();
    });
  });

  describe('voice grouping', () => {
    it('should display voices grouped by language', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('EN Voices')).toBeInTheDocument();
    });

    it('should handle empty voice groups gracefully', () => {
      mockUseTTS.getVoicesByLanguage.mockReturnValue({ en: [] });
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);
      
      const voiceSelect = screen.getByLabelText('System Voice');
      expect(voiceSelect).toBeInTheDocument();
      expect(screen.getByDisplayValue('Auto (Recommended)')).toBeInTheDocument();
    });
  });
});