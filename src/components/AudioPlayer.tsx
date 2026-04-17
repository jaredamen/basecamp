import React, { useState } from 'react';
import type { AudioBriefing } from '../types';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useTTS } from '../hooks/useTTS';

interface AudioPlayerProps {
  briefing: AudioBriefing;
  onBack: () => void;
}

const ArrowBackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);

const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ briefing, onBack }) => {
  const { playerState, loadBriefing, play, pause } = useAudioPlayer();
  const { ttsState, speak, stop: stopTTS } = useTTS();
  const [showScript, setShowScript] = useState(false);

  React.useEffect(() => {
    loadBriefing(briefing);
  }, [briefing, loadBriefing]);

  const handlePlayPause = () => {
    if (playerState.isPlaying || ttsState.isReading) {
      pause();
      stopTTS();
    } else {
      if (briefing.audio_file) {
        play();
      } else {
        speak(briefing.script, true);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-dark-800 px-4 py-3 border-b border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowBackIcon className="w-5 h-5 mr-1" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <button
            onClick={() => setShowScript(!showScript)}
            className="text-xs text-dark-400 hover:text-dark-200 px-2 py-1 rounded border border-dark-600 hover:border-dark-500"
          >
            {showScript ? 'Hide Script' : 'Show Script'}
          </button>
        </div>

        <h2 className="text-lg font-semibold text-dark-100 mb-1">
          {briefing.title}
        </h2>
        <div className="flex items-center space-x-4 text-sm text-dark-400">
          <span>{formatDate(briefing.created_at)}</span>
          {briefing.source && (() => {
            try {
              const hostname = new URL(briefing.source).hostname;
              return (
                <>
                  <span>&bull;</span>
                  <span>{hostname}</span>
                </>
              );
            } catch {
              return null;
            }
          })()}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {showScript ? (
          <div className="p-4 pb-32">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-dark-200 leading-relaxed">
                {briefing.script}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 pb-32">
            {/* Progress Bar (for audio files only) */}
            {briefing.audio_file && playerState.duration > 0 && (
              <div className="w-full max-w-sm mb-6">
                <div className="bg-dark-700 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(playerState.currentTime / playerState.duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-dark-400">
                  <span>{formatTime(playerState.currentTime)}</span>
                  <span>{formatTime(playerState.duration)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Play/Pause Button */}
      <div className="bg-dark-800 border-t border-dark-700 p-4 pb-20">
        <div className="audio-player-controls">
          <button
            onClick={handlePlayPause}
            className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors"
            aria-label={playerState.isPlaying || ttsState.isReading ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying || ttsState.isReading ? (
              <PauseIcon className="w-8 h-8" />
            ) : (
              <PlayIcon className="w-8 h-8 ml-1" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
