import { useEffect, useRef, useState } from 'react';
import { fetchVoiceAudio } from '../services/voiceTTS';
import { pickMotivational, pickStageLine } from '../services/voiceLines';
import type { GenerationStage } from './useContentGeneration';

const MOTIVATIONAL_GAP_MS = 6500;
/** Hard ceiling for how long a single line is allowed to "still be
 *  speaking" before we force-clear isSpeaking. Real TTS lines are
 *  ≤4s; 6s gives a safety margin in case the `ended` event never
 *  fires (rare browser bug or network jank). Without this the
 *  content-transition gate in App.tsx could lock indefinitely. */
const SPEECH_MAX_MS = 6000;

interface UseOrbVoiceInput {
  /** When true, the hook is active — speaks status + motivationals
   *  while gen is in flight. When false, the hook stops scheduling
   *  new lines but lets the current line play out (so the user hears
   *  a complete sentence before the visual transitions). */
  isGenerating: boolean;
  /** Current generation stage. State-line picks come from this. */
  stage: GenerationStage;
}

interface UseOrbVoiceOutput {
  /** The line currently being spoken (or just spoken). Surface in the
   *  orb caption so the visible status tracks the audio. Cleared on
   *  the audio element's `ended` event, NOT on stage change. */
  currentLine: string;
  /** True from the moment a line starts playing until its `ended` /
   *  `error` event fires (or the safety timeout expires). App.tsx
   *  uses this to defer the GeneratingBand → ContentBand transition:
   *  if a line is still speaking when stage='complete', the visual
   *  waits for the line to finish before swapping in the new content. */
  isSpeaking: boolean;
}

/**
 * JARVIS-style narrator: speaks generation status + motivationals while
 * the user waits. Uses the same nova TTS as the audio briefings.
 *
 * State machine:
 *   - On stage change → speak the corresponding stage line
 *   - Between stage changes (every ~6.5s while still in same stage) →
 *     speak a motivational
 *   - On stage='complete' or isGenerating=false → STOP scheduling new
 *     lines, but let the current spoken line finish naturally. App.tsx
 *     watches `isSpeaking` and defers the visual transition to the
 *     content view until the line's `ended` event fires.
 *
 * The exposed `currentLine` lets the orb caption track what the voice
 * is saying, so the user reads + hears the same beat.
 */
export function useOrbVoice({ isGenerating, stage }: UseOrbVoiceInput): UseOrbVoiceOutput {
  const [currentLine, setCurrentLine] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const motivationalTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const lastStageRef = useRef<GenerationStage>('idle');

  // Lazy-init the audio element once.
  useEffect(() => {
    audioElRef.current = new Audio();
    return () => {
      audioElRef.current?.pause();
      audioElRef.current = null;
      releaseBlob();
      clearMotivationalTimer();
      clearSafetyTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function releaseBlob() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }

  function clearMotivationalTimer() {
    if (motivationalTimerRef.current !== null) {
      window.clearTimeout(motivationalTimerRef.current);
      motivationalTimerRef.current = null;
    }
  }

  function clearSafetyTimer() {
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }

  function finishSpeaking() {
    setIsSpeaking(false);
    setCurrentLine('');
    clearSafetyTimer();
    releaseBlob();
  }

  async function speak(line: string) {
    setCurrentLine(line);
    setIsSpeaking(true);
    clearSafetyTimer();
    if (!audioElRef.current) {
      // No audio element — clear immediately.
      setIsSpeaking(false);
      return;
    }
    // If something is mid-play, drop it — newer line wins.
    audioElRef.current.pause();
    releaseBlob();

    try {
      const blob = await fetchVoiceAudio(line);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      const el = audioElRef.current;
      if (!el) {
        setIsSpeaking(false);
        return;
      }
      el.src = url;
      el.onended = finishSpeaking;
      el.onerror = finishSpeaking;
      // Belt-and-suspenders: cap how long isSpeaking can stay true.
      // Without this, a stuck `ended` event would lock the App-level
      // content transition indefinitely.
      safetyTimerRef.current = window.setTimeout(finishSpeaking, SPEECH_MAX_MS);
      await el.play();
    } catch (err) {
      // Silent fail on voice fetch — caption already shows the line
      // visually. Clear isSpeaking so the App-level transition gate
      // doesn't block.
      console.warn('Orb voice fetch failed', err);
      setIsSpeaking(false);
      clearSafetyTimer();
    }
  }

  // Schedule the next motivational while we're still in the same stage.
  function scheduleMotivational(stageAtSchedule: GenerationStage) {
    clearMotivationalTimer();
    motivationalTimerRef.current = window.setTimeout(() => {
      if (lastStageRef.current === stageAtSchedule && stageAtSchedule !== 'complete' && stageAtSchedule !== 'idle') {
        void speak(pickMotivational());
        scheduleMotivational(stageAtSchedule);
      }
    }, MOTIVATIONAL_GAP_MS);
  }

  // Drive on stage / isGenerating changes.
  useEffect(() => {
    if (!isGenerating || stage === 'complete' || stage === 'idle') {
      // Stop SCHEDULING new lines, but DO NOT pause the current
      // playback. The audio element keeps playing; isSpeaking stays
      // true until the `ended` event fires; App.tsx waits for
      // isSpeaking=false before transitioning the visual to content.
      clearMotivationalTimer();
      lastStageRef.current = stage;
      return;
    }

    // Stage actually changed — speak the new stage line.
    if (lastStageRef.current !== stage) {
      lastStageRef.current = stage;
      const line = pickStageLine(stage);
      if (line) {
        void speak(line);
      }
      scheduleMotivational(stage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, stage]);

  return { currentLine, isSpeaking };
}
