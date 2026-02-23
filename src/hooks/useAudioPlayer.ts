import { useState, useEffect, useRef } from 'react';
import type { AudioBriefing, AudioPlayerState } from '../types';
import createDataLoader from '../data/loader';

export const useAudioBriefings = () => {
  const [briefings, setBriefings] = useState<AudioBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBriefings = async () => {
    try {
      setLoading(true);
      setError(null);
      const dataLoader = createDataLoader();
      const loadedBriefings = await dataLoader.loadAudioBriefings();
      setBriefings(loadedBriefings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load briefings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefings();
  }, []);

  const addBriefing = (newBriefing: AudioBriefing) => {
    setBriefings(prev => [...prev, newBriefing]);
  };

  const addBriefings = (newBriefings: AudioBriefing[]) => {
    setBriefings(prev => [...prev, ...newBriefings]);
  };

  return {
    briefings,
    loading,
    error,
    reload: loadBriefings,
    addBriefing,
    addBriefings
  };
};

export const useAudioPlayer = () => {
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    currentBriefing: undefined
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      const audio = audioRef.current;

      audio.addEventListener('loadedmetadata', () => {
        setPlayerState(prev => ({ ...prev, duration: audio.duration }));
      });

      audio.addEventListener('timeupdate', () => {
        setPlayerState(prev => ({ ...prev, currentTime: audio.currentTime }));
      });

      audio.addEventListener('ended', () => {
        setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setPlayerState(prev => ({ ...prev, isPlaying: false }));
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('loadedmetadata', () => {});
        audioRef.current.removeEventListener('timeupdate', () => {});
        audioRef.current.removeEventListener('ended', () => {});
        audioRef.current.removeEventListener('error', () => {});
      }
      if (speechSynthRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const loadBriefing = (briefing: AudioBriefing) => {
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (speechSynthRef.current) {
      window.speechSynthesis.cancel();
    }

    setPlayerState(prev => ({
      ...prev,
      currentBriefing: briefing,
      currentTime: 0,
      isPlaying: false,
      duration: 0
    }));

    if (briefing.audio_file && audioRef.current) {
      // Load actual audio file
      audioRef.current.src = briefing.audio_file;
      audioRef.current.playbackRate = playerState.playbackRate;
    }
  };

  const play = async () => {
    if (!playerState.currentBriefing) return;

    try {
      if (playerState.currentBriefing.audio_file && audioRef.current) {
        // Play actual audio file
        await audioRef.current.play();
        setPlayerState(prev => ({ ...prev, isPlaying: true }));
      } else {
        // Use text-to-speech for script
        if (speechSynthRef.current) {
          window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(playerState.currentBriefing.script);
        utterance.rate = playerState.playbackRate;
        utterance.onstart = () => {
          setPlayerState(prev => ({ ...prev, isPlaying: true }));
        };
        utterance.onend = () => {
          setPlayerState(prev => ({ ...prev, isPlaying: false }));
        };
        utterance.onerror = () => {
          setPlayerState(prev => ({ ...prev, isPlaying: false }));
        };

        speechSynthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Playback failed:', error);
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const pause = () => {
    if (audioRef.current && playerState.currentBriefing?.audio_file) {
      audioRef.current.pause();
    } else {
      window.speechSynthesis.pause();
    }
    setPlayerState(prev => ({ ...prev, isPlaying: false }));
  };

  const seekTo = (time: number) => {
    if (audioRef.current && playerState.currentBriefing?.audio_file) {
      audioRef.current.currentTime = time;
      setPlayerState(prev => ({ ...prev, currentTime: time }));
    }
    // Note: TTS doesn't support seeking
  };

  const skipForward = (seconds: number = 15) => {
    if (audioRef.current && playerState.currentBriefing?.audio_file) {
      const newTime = Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration);
      seekTo(newTime);
    }
  };

  const skipBackward = (seconds: number = 15) => {
    if (audioRef.current && playerState.currentBriefing?.audio_file) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      seekTo(newTime);
    }
  };

  const setPlaybackRate = (rate: number) => {
    setPlayerState(prev => ({ ...prev, playbackRate: rate }));
    
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    
    if (speechSynthRef.current) {
      speechSynthRef.current.rate = rate;
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (speechSynthRef.current) {
      window.speechSynthesis.cancel();
    }
    setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  };

  return {
    playerState,
    loadBriefing,
    play,
    pause,
    stop,
    seekTo,
    skipForward,
    skipBackward,
    setPlaybackRate
  };
};