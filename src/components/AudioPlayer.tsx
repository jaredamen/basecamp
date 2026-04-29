import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioBriefing, AudioQuiz } from '../types';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useTTS } from '../hooks/useTTS';
import { proxyTTS, InsufficientCreditsError } from '../services/managedProxy';

/** The single product voice. OpenAI's "nova" — natural, warm, conversational. */
const PRODUCT_VOICE = 'nova';

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

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
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

type Backend = 'openai' | 'browser';

/**
 * Convert any error from /api/proxy/tts into a single-sentence user-visible
 * message that explains why the high-quality voice isn't playing. We always
 * fall back to the browser robot voice, but the user must know *why* — silent
 * degradation is the worst possible UX.
 */
function classifyAudioError(err: unknown): string {
  if (err instanceof InsufficientCreditsError) {
    return 'Out of credits. Add a payment method to keep listening with the high-quality voice.';
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes('401') || m.includes('unauthor') || m.includes('sign in')) {
      return 'Sign in to use the high-quality voice. Using browser voice for now.';
    }
    if (m.includes('429') || m.includes('rate')) {
      return 'Rate limited. Using browser voice for now — try again in a moment.';
    }
    if (m.includes('timeout') || m.includes('aborted')) {
      return 'Voice service timed out. Using browser voice.';
    }
    if (m.includes('payment') || m.includes('402')) {
      return 'Add a payment method to use the high-quality voice. Using browser voice for now.';
    }
  }
  return 'Voice service unavailable. Using browser voice.';
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ briefing, onBack }) => {
  const { playerState, loadBriefing, play, pause } = useAudioPlayer();
  const { ttsState, speak, stop: stopTTS } = useTTS();
  const [showScript, setShowScript] = useState(false);

  const sections = briefing.sections;
  const quizzes = briefing.quizzes;
  const hasInteractive = !!(sections && sections.length > 0 && quizzes);

  const [sectionIndex, setSectionIndex] = useState(0);
  const [isSectionPlaying, setIsSectionPlaying] = useState(false);
  const [pendingQuiz, setPendingQuiz] = useState<AudioQuiz | null>(null);
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const [isFetchingAudio, setIsFetchingAudio] = useState(false);
  const [backend, setBackend] = useState<Backend>('openai');
  /** Single voice-error banner. Set whenever we fall back from OpenAI nova
   *  to the browser robot voice, so the user always knows *why*. */
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // OpenAI audio playback. Cache one blob URL per section so re-listening
  // doesn't re-bill, and prefetch the next section while the current one plays.
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<Map<number, string>>(new Map());
  const inFlightRef = useRef<Map<number, Promise<string | null>>>(new Map());

  // Browser-speech fallback path
  const sectionUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceSettingsRef = useRef(ttsState.voiceSettings);
  useEffect(() => {
    voiceSettingsRef.current = ttsState.voiceSettings;
  }, [ttsState.voiceSettings]);

  // Lazy-init the HTMLAudioElement once
  useEffect(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    return () => {
      audioElRef.current?.pause();
      audioElRef.current = null;
    };
  }, []);

  // When the briefing changes, reset state and free any cached blob URLs.
  // Depends only on briefingId — useAudioPlayer.loadBriefing isn't memoized,
  // so depending on it here would re-run every render and the cleanup would
  // cancel speech mid-playback.
  const briefingId = briefing.briefing_id;
  useEffect(() => {
    loadBriefing(briefing);
    setSectionIndex(0);
    setIsSectionPlaying(false);
    setPendingQuiz(null);
    setQuizSelection(null);
    setBackend('openai');
    setVoiceError(null);
    inFlightRef.current.clear();
    return () => {
      window.speechSynthesis.cancel();
      audioElRef.current?.pause();
      for (const url of audioUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      audioUrlsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefingId]);

  /** Fetch and cache the OpenAI MP3 for a single section. Returns a blob URL,
   *  or null if the call failed (network, 401 demo path, etc.) so the caller
   *  can fall back to browser speech. */
  const fetchSectionAudio = useCallback(async (i: number): Promise<string | null> => {
    if (!sections) return null;
    const cached = audioUrlsRef.current.get(i);
    if (cached) return cached;
    const inFlight = inFlightRef.current.get(i);
    if (inFlight) return inFlight;

    const section = sections[i];
    if (!section) return null;
    // The TTS endpoint caps at 4096 chars. Sections should fit comfortably,
    // but slice defensively rather than 400 the whole call.
    const text = section.content.slice(0, 4096);

    const promise = (async () => {
      try {
        const { audioBlob } = await proxyTTS({ text, voice: PRODUCT_VOICE });
        const url = URL.createObjectURL(audioBlob);
        audioUrlsRef.current.set(i, url);
        return url;
      } catch (err) {
        // Always tell the user *why* we're falling back. Silent degradation
        // to the browser robot voice is the worst possible UX.
        setVoiceError(classifyAudioError(err));
        console.warn('OpenAI TTS unavailable, falling back to browser voice', err);
        return null;
      } finally {
        inFlightRef.current.delete(i);
      }
    })();
    inFlightRef.current.set(i, promise);
    return promise;
  }, [sections]);

  /** Browser-speech fallback. Used when OpenAI TTS isn't available
   *  (demo path, no auth, no credits, network failure). */
  const speakViaBrowser = useCallback((i: number) => {
    if (!sections || i >= sections.length) {
      setIsSectionPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const section = sections[i];
    const utterance = new SpeechSynthesisUtterance(section.content);
    const settings = voiceSettingsRef.current;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    utterance.onstart = () => setIsSectionPlaying(true);
    utterance.onend = () => {
      setIsSectionPlaying(false);
      const quiz = quizzes?.find(q => q.afterSectionIndex === i);
      if (quiz) {
        setPendingQuiz(quiz);
        setQuizSelection(null);
        return;
      }
      const next = i + 1;
      if (sections && next < sections.length) {
        setSectionIndex(next);
        speakViaBrowser(next);
      }
    };
    utterance.onerror = () => setIsSectionPlaying(false);

    sectionUtteranceRef.current = utterance;
    setSectionIndex(i);
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  }, [sections, quizzes]);

  /** Play section i: prefer OpenAI audio, fall back to browser speech. */
  const playSection = useCallback(async (i: number) => {
    if (!sections || i >= sections.length) {
      setIsSectionPlaying(false);
      return;
    }

    setSectionIndex(i);
    setIsFetchingAudio(true);
    const url = await fetchSectionAudio(i);
    setIsFetchingAudio(false);

    if (!url) {
      setBackend('browser');
      speakViaBrowser(i);
      return;
    }
    setBackend('openai');

    const el = audioElRef.current;
    if (!el) {
      speakViaBrowser(i);
      return;
    }

    el.src = url;
    el.onplay = () => setIsSectionPlaying(true);
    el.onpause = () => setIsSectionPlaying(false);
    el.onended = () => {
      setIsSectionPlaying(false);
      const quiz = quizzes?.find(q => q.afterSectionIndex === i);
      if (quiz) {
        setPendingQuiz(quiz);
        setQuizSelection(null);
        return;
      }
      const next = i + 1;
      if (sections && next < sections.length) {
        playSection(next);
      }
    };
    el.onerror = () => {
      setIsSectionPlaying(false);
      // Audio element failed to play this blob — fall back to browser speech.
      setBackend('browser');
      speakViaBrowser(i);
    };

    try {
      await el.play();
    } catch {
      setBackend('browser');
      speakViaBrowser(i);
      return;
    }

    // Prefetch the next section while the current one plays so the handoff
    // is seamless (no audible gap waiting on the network).
    if (sections && i + 1 < sections.length) {
      void fetchSectionAudio(i + 1);
    }
  }, [sections, quizzes, fetchSectionAudio, speakViaBrowser]);

  const handlePlayPause = () => {
    if (hasInteractive) {
      if (pendingQuiz) return;

      if (isSectionPlaying) {
        if (backend === 'openai') {
          audioElRef.current?.pause();
        } else {
          window.speechSynthesis.pause();
        }
        setIsSectionPlaying(false);
        return;
      }

      // Resume mid-section
      if (backend === 'openai' && audioElRef.current?.paused && audioElRef.current.src) {
        void audioElRef.current.play();
        return;
      }
      if (backend === 'browser' && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsSectionPlaying(true);
        return;
      }

      // Fresh start (or after an answered quiz)
      void playSection(sectionIndex);
      return;
    }

    // Legacy / non-interactive briefings: original behaviour
    if (playerState.isPlaying || ttsState.isReading) {
      pause();
      stopTTS();
    } else {
      if (briefing.audio_file) {
        play();
      } else {
        speak(briefing.script);
      }
    }
  };

  const handleQuizAnswer = (choiceIndex: number) => {
    if (!pendingQuiz || quizSelection !== null) return;
    setQuizSelection(choiceIndex);

    const isCorrect = choiceIndex === pendingQuiz.correctIndex;
    const advanceMs = isCorrect ? 1500 : 3000;

    window.setTimeout(() => {
      const nextIdx = pendingQuiz.afterSectionIndex + 1;
      setPendingQuiz(null);
      setQuizSelection(null);
      setSectionIndex(nextIdx);
      if (sections && nextIdx < sections.length) {
        void playSection(nextIdx);
      }
    }, advanceMs);
  };

  const isCurrentlyPlaying = hasInteractive
    ? isSectionPlaying
    : (playerState.isPlaying || ttsState.isReading);

  const statusLabel = pendingQuiz
    ? 'Quiz time'
    : isFetchingAudio
      ? 'Loading voice…'
      : isSectionPlaying
        ? backend === 'browser' ? 'Playing (browser voice)' : 'Playing'
        : 'Ready';

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
          {hasInteractive && sections && (
            <>
              <span>&bull;</span>
              <span>Section {Math.min(sectionIndex + 1, sections.length)} of {sections.length}</span>
            </>
          )}
        </div>
      </div>

      {voiceError && (
        <div className="bg-orange-600/20 border-b border-orange-600/30 text-orange-300 text-sm px-4 py-3 flex items-center justify-between gap-4">
          <span className="flex-1">{voiceError}</span>
          <button
            onClick={() => setVoiceError(null)}
            className="text-orange-200 hover:text-white text-xs underline-offset-2 hover:underline"
            aria-label="Dismiss voice notice"
          >
            Dismiss
          </button>
        </div>
      )}

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
            {hasInteractive && sections && !briefing.audio_file && (
              <div className="w-full max-w-md mb-6">
                <div className="bg-dark-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((sectionIndex + (isSectionPlaying ? 0.5 : 0)) / sections.length) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-dark-400 mt-2">
                  <span>{statusLabel}</span>
                  <span>{quizzes?.length ?? 0} checkpoint{(quizzes?.length ?? 0) === 1 ? '' : 's'}</span>
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
            disabled={!!pendingQuiz || isFetchingAudio}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-dark-700 disabled:cursor-not-allowed rounded-full text-white transition-colors"
            aria-label={isCurrentlyPlaying ? 'Pause' : isFetchingAudio ? 'Loading' : 'Play'}
          >
            {isFetchingAudio ? (
              <SpinnerIcon className="w-8 h-8 animate-spin" />
            ) : isCurrentlyPlaying ? (
              <PauseIcon className="w-8 h-8" />
            ) : (
              <PlayIcon className="w-8 h-8 ml-1" />
            )}
          </button>
        </div>
      </div>

      {pendingQuiz && (
        <QuizOverlay
          quiz={pendingQuiz}
          selection={quizSelection}
          onSelect={handleQuizAnswer}
        />
      )}
    </div>
  );
};

interface QuizOverlayProps {
  quiz: AudioQuiz;
  selection: number | null;
  onSelect: (choiceIndex: number) => void;
}

const QuizOverlay: React.FC<QuizOverlayProps> = ({ quiz, selection, onSelect }) => {
  const answered = selection !== null;
  const isCorrect = selection === quiz.correctIndex;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/85 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Active recall checkpoint"
    >
      <div className="w-full max-w-lg bg-dark-800 border border-purple-500/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          Quick check
        </div>
        <p className="text-lg font-semibold text-white leading-snug mb-5">{quiz.question}</p>

        <div className="space-y-2">
          {quiz.choices.map((choice, idx) => {
            const isSelected = selection === idx;
            const isAnswerKey = idx === quiz.correctIndex;
            let stateClass = 'bg-dark-700 border-transparent text-dark-100 hover:border-purple-500/40 hover:bg-purple-500/10';
            if (answered) {
              if (isAnswerKey) {
                stateClass = 'bg-green-500/15 border-green-400/60 text-white';
              } else if (isSelected) {
                stateClass = 'bg-orange-500/15 border-orange-400/60 text-white';
              } else {
                stateClass = 'bg-dark-700 border-transparent text-dark-400 opacity-60';
              }
            }
            return (
              <button
                key={idx}
                onClick={() => onSelect(idx)}
                disabled={answered}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-base flex items-center gap-3 transition-all ${stateClass}`}
              >
                <span className="w-8 h-8 rounded-lg bg-dark-600 text-dark-200 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{choice}</span>
                {answered && isAnswerKey && <span className="text-green-400 font-bold">✓</span>}
                {answered && isSelected && !isAnswerKey && <span className="text-orange-400 font-bold">✗</span>}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${isCorrect ? 'bg-green-500/10 text-green-300' : 'bg-orange-500/10 text-orange-300'}`}>
            <span className="font-semibold">{isCorrect ? 'Right.' : 'Not quite.'} </span>
            {quiz.explanation || (isCorrect
              ? 'Resuming the lesson…'
              : `The correct answer was ${String.fromCharCode(65 + quiz.correctIndex)}.`)}
          </div>
        )}
      </div>
    </div>
  );
};
