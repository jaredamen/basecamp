import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AudioPlayer } from '../AudioPlayer';
import type { AudioBriefing } from '../../types';

// Mock hooks
const mockUseAudioPlayer = {
  playerState: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    currentBriefing: undefined
  },
  loadBriefing: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  skipBackward: vi.fn(),
  skipForward: vi.fn(),
  setPlaybackRate: vi.fn()
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
  speak: vi.fn(),
  stop: vi.fn()
};

vi.mock('../../hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => mockUseAudioPlayer
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

describe('AudioPlayer', () => {
  const mockOnBack = vi.fn();
  
  const sampleBriefing: AudioBriefing = {
    briefing_id: 'test-briefing',
    title: 'Test Briefing',
    source: 'https://example.com/test',
    created_at: '2024-01-01T00:00:00Z',
    script: 'This is a test briefing script for TTS testing.',
    audio_file: undefined // Testing TTS mode
  };

  const sampleBriefingWithAudio: AudioBriefing = {
    ...sampleBriefing,
    audio_file: '/test-audio.mp3'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAudioPlayer.playerState = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
      currentBriefing: undefined
    };
    mockUseTTS.ttsState = {
      isReading: false,
      voiceSettings: {
        personality: 'standard',
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
        systemVoice: undefined
      },
      availableVoices: []
    };
  });

  describe('TTS mode (no audio file)', () => {
    it('should render TTS-specific UI elements', () => {
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      expect(screen.getByText('TTS: standard')).toBeInTheDocument();
      expect(screen.getByText('Voice: standard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /voice/i })).toBeInTheDocument();
    });

    it('should show Peter Griffin emoji when personality is selected', () => {
      mockUseTTS.ttsState.voiceSettings.personality = 'peter-griffin';
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      expect(screen.getByText('TTS: peter griffin')).toBeInTheDocument();
      expect(screen.getByText(/Voice: peter griffin 🍺/)).toBeInTheDocument();
    });

    it('should open voice settings modal when voice button is clicked', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const voiceButton = screen.getByRole('button', { name: /voice/i });
      await user.click(voiceButton);

      expect(screen.getByTestId('voice-settings-modal')).toBeInTheDocument();
    });

    it('should close voice settings modal when close is clicked', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const voiceButton = screen.getByRole('button', { name: /voice/i });
      await user.click(voiceButton);

      const closeButton = screen.getByText('Close Modal');
      await user.click(closeButton);

      expect(screen.queryByTestId('voice-settings-modal')).not.toBeInTheDocument();
    });

    it('should use TTS when play button is clicked without audio file', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);

      expect(mockUseTTS.speak).toHaveBeenCalledWith(sampleBriefing.script, true);
      expect(mockUseAudioPlayer.play).not.toHaveBeenCalled();
    });

    it('should show read script aloud button in script view', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      // Switch to script view
      const showScriptButton = screen.getByText('Show Script');
      await user.click(showScriptButton);

      const readScriptButton = screen.getByRole('button', { name: /read script aloud/i });
      expect(readScriptButton).toBeInTheDocument();

      await user.click(readScriptButton);
      expect(mockUseTTS.speak).toHaveBeenCalledWith(sampleBriefing.script, true);
    });

    it('should show reading status when TTS is active', () => {
      mockUseTTS.ttsState.isReading = true;
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const playButton = screen.getByRole('button', { name: /pause/i });
      expect(playButton).toBeInTheDocument();
    });

    it('should stop TTS when pause button is clicked during TTS reading', async () => {
      mockUseTTS.ttsState.isReading = true;
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      expect(mockUseTTS.stop).toHaveBeenCalled();
      expect(mockUseAudioPlayer.pause).toHaveBeenCalled();
    });

    it('should not show audio-only controls in TTS mode', () => {
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      expect(screen.queryByLabelText(/skip backward/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/skip forward/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/progress bar/i)).not.toBeInTheDocument();
    });
  });

  describe('Audio mode (with audio file)', () => {
    it('should not show voice settings button with audio file', () => {
      render(<AudioPlayer briefing={sampleBriefingWithAudio} onBack={mockOnBack} />);

      expect(screen.queryByRole('button', { name: /voice/i })).not.toBeInTheDocument();
    });

    it('should show audio-specific UI elements', () => {
      render(<AudioPlayer briefing={sampleBriefingWithAudio} onBack={mockOnBack} />);

      expect(screen.getByText('Audio Briefing')).toBeInTheDocument();
    });

    it('should use audio player when play button is clicked with audio file', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefingWithAudio} onBack={mockOnBack} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);

      expect(mockUseAudioPlayer.play).toHaveBeenCalled();
      expect(mockUseTTS.speak).not.toHaveBeenCalled();
    });

    it('should show skip controls with audio file', () => {
      render(<AudioPlayer briefing={sampleBriefingWithAudio} onBack={mockOnBack} />);

      expect(screen.getByLabelText(/skip backward/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/skip forward/i)).toBeInTheDocument();
    });

    it('should show progress bar with audio duration', () => {
      mockUseAudioPlayer.playerState.duration = 120; // 2 minutes
      mockUseAudioPlayer.playerState.currentTime = 60; // 1 minute
      render(<AudioPlayer briefing={sampleBriefingWithAudio} onBack={mockOnBack} />);

      expect(screen.getByText('1:00')).toBeInTheDocument(); // Current time
      expect(screen.getByText('2:00')).toBeInTheDocument(); // Duration
    });
  });

  describe('common functionality', () => {
    it('should load briefing on mount', () => {
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      expect(mockUseAudioPlayer.loadBriefing).toHaveBeenCalledWith(sampleBriefing);
    });

    it('should call onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const backButton = screen.getByText('Back');
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should toggle script visibility', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const showScriptButton = screen.getByText('Show Script');
      await user.click(showScriptButton);

      expect(screen.getByText(sampleBriefing.script)).toBeInTheDocument();
      expect(screen.getByText('Hide Script')).toBeInTheDocument();
    });

    it('should display briefing metadata', () => {
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      expect(screen.getByText('Test Briefing')).toBeInTheDocument();
      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    });

    it('should handle playback rate changes', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const rate125Button = screen.getByRole('button', { name: '1.25x' });
      await user.click(rate125Button);

      expect(mockUseAudioPlayer.setPlaybackRate).toHaveBeenCalledWith(1.25);
    });

    it('should highlight current playback rate', () => {
      mockUseAudioPlayer.playerState.playbackRate = 1.5;
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const rate15Button = screen.getByRole('button', { name: '1.5x' });
      expect(rate15Button).toHaveClass('bg-blue-600');
    });
  });

  describe('TTS reading indicator', () => {
    it('should show reading indicator when TTS is active', () => {
      mockUseTTS.ttsState.isReading = true;
      mockUseTTS.ttsState.voiceSettings.personality = 'peter-griffin';
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      expect(screen.getByText(/Reading with peter griffin voice 🍺/)).toBeInTheDocument();
    });

    it('should not show reading indicator when TTS is not active', () => {
      mockUseTTS.ttsState.isReading = false;
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      expect(screen.queryByText(/Reading with/)).not.toBeInTheDocument();
    });
  });

  describe('integration with both TTS and audio player', () => {
    it('should pause both TTS and audio when pause is clicked', async () => {
      mockUseAudioPlayer.playerState.isPlaying = true;
      mockUseTTS.ttsState.isReading = true;
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      expect(mockUseAudioPlayer.pause).toHaveBeenCalled();
      expect(mockUseTTS.stop).toHaveBeenCalled();
    });

    it('should show play icon when neither audio nor TTS is playing', () => {
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeInTheDocument();
    });

    it('should show pause icon when either audio or TTS is playing', () => {
      mockUseTTS.ttsState.isReading = true;
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      expect(pauseButton).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle missing briefing source gracefully', () => {
      const briefingWithoutSource = { ...sampleBriefing, source: '' };
      render(<AudioPlayer briefing={briefingWithoutSource} onBack={mockOnBack} />);

      expect(screen.getByText('Test Briefing')).toBeInTheDocument();
      expect(screen.queryByText('•')).not.toBeInTheDocument();
    });

    it('should handle invalid source URL gracefully', () => {
      const briefingWithInvalidSource = { ...sampleBriefing, source: 'invalid-url' };
      
      expect(() => {
        render(<AudioPlayer briefing={briefingWithInvalidSource} onBack={mockOnBack} />);
      }).not.toThrow();
    });
  });
});