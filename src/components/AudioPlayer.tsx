import React, { useState } from 'react';
import type { AudioBriefing } from '../types';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useTTS } from '../hooks/useTTS';
import { VoiceSettings } from './VoiceSettings';

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

const BackwardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
  </svg>
);

const ForwardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
  const { playerState, loadBriefing, play, pause, skipBackward, skipForward, setPlaybackRate } = useAudioPlayer();
  const { ttsState, speak, stop: stopTTS } = useTTS();
  const [showScript, setShowScript] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
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
        // Use enhanced TTS for script reading
        speak(briefing.script, true);
      }
    }
  };

  const handleReadScript = () => {
    if (ttsState.isReading) {
      stopTTS();
    } else {
      speak(briefing.script, true);
    }
  };

  const playbackRates = [1, 1.25, 1.5, 2];

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
          <div className="flex space-x-2">
            <button
              onClick={() => setShowScript(!showScript)}
              className="text-xs text-dark-400 hover:text-dark-200 px-2 py-1 rounded border border-dark-600 hover:border-dark-500"
            >
              {showScript ? 'Hide Script' : 'Show Script'}
            </button>
            {!briefing.audio_file && (
              <button
                onClick={() => setShowVoiceSettings(true)}
                className="text-xs text-dark-400 hover:text-dark-200 px-2 py-1 rounded border border-dark-600 hover:border-dark-500 flex items-center space-x-1"
                title="Voice Settings"
              >
                <SettingsIcon className="w-3 h-3" />
                <span>Voice</span>
              </button>
            )}
          </div>
        </div>
        
        <h2 className="text-lg font-semibold text-dark-100 mb-1">
          {briefing.title}
        </h2>
        <div className="flex items-center space-x-4 text-sm text-dark-400">
          <span>{formatDate(briefing.created_at)}</span>
          {briefing.source && (
            <>
              <span>•</span>
              <span>{new URL(briefing.source).hostname}</span>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {showScript ? (
          /* Script View */
          <div className="p-4 pb-32">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-dark-200 leading-relaxed">
                {briefing.script}
              </div>
            </div>
          </div>
        ) : (
          /* Player View */
          <div className="flex-1 flex flex-col items-center justify-center p-8 pb-32">
            {/* Artwork/Icon */}
            <div className="w-48 h-48 bg-dark-800 rounded-xl mb-8 flex items-center justify-center border border-dark-600">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <PlayIcon className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-sm text-dark-400">
                  {briefing.audio_file ? 'Audio Briefing' : `TTS: ${ttsState.voiceSettings.personality.replace('-', ' ')}`}
                </p>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8 max-w-sm">
              <h3 className="text-xl font-semibold text-dark-100 mb-2">
                {briefing.title}
              </h3>
              <p className="text-sm text-dark-400">
                {formatDate(briefing.created_at)}
              </p>
            </div>

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

            {/* Playback Rate */}
            <div className="mb-6">
              <div className="flex space-x-2">
                {playbackRates.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      playerState.playbackRate === rate
                        ? 'bg-blue-600 text-white'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* TTS Status */}
            {!briefing.audio_file && (
              <div className="mb-6 text-center space-y-2">
                <p className="text-sm text-dark-400 bg-dark-800 px-4 py-2 rounded-lg">
                  Voice: {ttsState.voiceSettings.personality.replace('-', ' ')}
                  {ttsState.voiceSettings.personality === 'peter-griffin' && ' 🍺'}
                </p>
                {showScript && (
                  <button
                    onClick={handleReadScript}
                    disabled={ttsState.isReading}
                    className="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-dark-600 disabled:text-dark-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {ttsState.isReading ? 'Reading...' : 'Read Script Aloud'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Player Controls */}
      <div className="bg-dark-800 border-t border-dark-700 p-4 pb-20">
        <div className="audio-player-controls">
          {briefing.audio_file && (
            <button
              onClick={() => skipBackward(15)}
              className="p-3 text-dark-300 hover:text-dark-100 transition-colors"
              aria-label="Skip backward 15 seconds"
            >
              <div className="relative">
                <BackwardIcon className="w-8 h-8" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">15</span>
              </div>
            </button>
          )}

          <button
            onClick={handlePlayPause}
            className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors"
            aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying || ttsState.isReading ? (
              <PauseIcon className="w-8 h-8" />
            ) : (
              <PlayIcon className="w-8 h-8 ml-1" />
            )}
          </button>

          {briefing.audio_file && (
            <button
              onClick={() => skipForward(15)}
              className="p-3 text-dark-300 hover:text-dark-100 transition-colors"
              aria-label="Skip forward 15 seconds"
            >
              <div className="relative">
                <ForwardIcon className="w-8 h-8" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">15</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Voice Settings Modal */}
      <VoiceSettings 
        isOpen={showVoiceSettings} 
        onClose={() => setShowVoiceSettings(false)} 
      />
    </div>
  );
};