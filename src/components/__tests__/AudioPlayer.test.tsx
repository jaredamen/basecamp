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
    it('should use TTS when play button is clicked without audio file', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);

      expect(mockUseTTS.speak).toHaveBeenCalledWith(sampleBriefing.script, true);
      expect(mockUseAudioPlayer.play).not.toHaveBeenCalled();
    });

    it('should show reading status when TTS is active', () => {
      mockUseTTS.ttsState.isReading = true;
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      expect(pauseButton).toBeInTheDocument();
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

    it('should not show skip controls in TTS mode', () => {
      render(<AudioPlayer briefing={sampleBriefing} onBack={mockOnBack} />);

      expect(screen.queryByLabelText(/skip backward/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/skip forward/i)).not.toBeInTheDocument();
    });
  });

  describe('Audio mode (with audio file)', () => {
    it('should use audio player when play button is clicked with audio file', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer briefing={sampleBriefingWithAudio} onBack={mockOnBack} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);

      expect(mockUseAudioPlayer.play).toHaveBeenCalled();
      expect(mockUseTTS.speak).not.toHaveBeenCalled();
    });

    it('should show progress bar with audio duration', () => {
      mockUseAudioPlayer.playerState.duration = 120;
      mockUseAudioPlayer.playerState.currentTime = 60;
      render(<AudioPlayer briefing={sampleBriefingWithAudio} onBack={mockOnBack} />);

      expect(screen.getByText('1:00')).toBeInTheDocument();
      expect(screen.getByText('2:00')).toBeInTheDocument();
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
      render(<AudioPlayer briefing={briefingWithInvalidSource} onBack={mockOnBack} />);

      // Should render without crashing; invalid URL hostname is not shown
      expect(screen.getByText('Test Briefing')).toBeInTheDocument();
      expect(screen.queryByText('\u2022')).not.toBeInTheDocument();
    });
  });
});
