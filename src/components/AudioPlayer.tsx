import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioBriefing, AudioQuiz } from '../types';
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

  // Pause-and-Quiz state — only used when briefing has sections + quizzes
  const sections = briefing.sections;
  const quizzes = briefing.quizzes;
  const hasInteractive = !!(sections && sections.length > 0 && quizzes);

  const [sectionIndex, setSectionIndex] = useState(0);
  const [isSectionPlaying, setIsSectionPlaying] = useState(false);
  const [pendingQuiz, setPendingQuiz] = useState<AudioQuiz | null>(null);
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const sectionUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Voice settings can change between renders; keep a ref so the speak callback
  // stays stable and uses the latest settings without re-creating itself.
  const voiceSettingsRef = useRef(ttsState.voiceSettings);
  useEffect(() => {
    voiceSettingsRef.current = ttsState.voiceSettings;
  }, [ttsState.voiceSettings]);

  React.useEffect(() => {
    loadBriefing(briefing);
    setSectionIndex(0);
    setIsSectionPlaying(false);
    setPendingQuiz(null);
    setQuizSelection(null);
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [briefing, loadBriefing]);

  const speakSection = useCallback((i: number) => {
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
        speakSection(next);
      }
    };
    utterance.onerror = () => setIsSectionPlaying(false);

    sectionUtteranceRef.current = utterance;
    setSectionIndex(i);
    window.speechSynthesis.speak(utterance);
  }, [sections, quizzes]);

  const handlePlayPause = () => {
    if (hasInteractive) {
      if (pendingQuiz) return; // can't play through a quiz overlay
      if (isSectionPlaying) {
        window.speechSynthesis.pause();
        setIsSectionPlaying(false);
        return;
      }
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsSectionPlaying(true);
        return;
      }
      speakSection(sectionIndex);
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
        speak(briefing.script, true);
      }
    }
  };

  const handleQuizAnswer = (choiceIndex: number) => {
    if (!pendingQuiz || quizSelection !== null) return;
    setQuizSelection(choiceIndex);

    const isCorrect = choiceIndex === pendingQuiz.correctIndex;
    // Wrong answers linger longer so the listener has time to read the
    // explanation. Correct answers move on briskly to keep momentum.
    const advanceMs = isCorrect ? 1500 : 3000;

    window.setTimeout(() => {
      const nextIdx = pendingQuiz.afterSectionIndex + 1;
      setPendingQuiz(null);
      setQuizSelection(null);
      setSectionIndex(nextIdx);
      if (sections && nextIdx < sections.length) {
        speakSection(nextIdx);
      }
    }, advanceMs);
  };

  const isCurrentlyPlaying = hasInteractive
    ? isSectionPlaying
    : (playerState.isPlaying || ttsState.isReading);

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
            {/* Progress bar — shown for audio files (timestamps) or interactive sections */}
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
                  <span>{isSectionPlaying ? 'Playing' : pendingQuiz ? 'Quiz time' : 'Ready'}</span>
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
            disabled={!!pendingQuiz}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-dark-700 disabled:cursor-not-allowed rounded-full text-white transition-colors"
            aria-label={isCurrentlyPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentlyPlaying ? (
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
