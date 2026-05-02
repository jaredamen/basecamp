import { useEffect, useRef, useState } from 'react';
import { fetchVoiceAudio } from '../services/voiceTTS';
import { pickMotivational, pickStageLine } from '../services/voiceLines';
import type { GenerationStage } from './useContentGeneration';

const MOTIVATIONAL_GAP_MS = 6500;

interface UseOrbVoiceInput {
  /** When true, the hook is active — speaks status + motivationals
   *  while gen is in flight. When false, immediately stops anything
   *  in flight. */
  isGenerating: boolean;
  /** Current generation stage. State-line picks come from this. */
  stage: GenerationStage;
}

interface UseOrbVoiceOutput {
  /** The line currently being spoken (or just spoken). Surface in the
   *  orb caption so the visible status tracks the audio. */
  currentLine: string;
}

/**
 * JARVIS-style narrator: speaks generation status + motivationals while
 * the user waits. Uses the same nova TTS as the audio briefings.
 *
 * State machine:
 *   - On stage change → speak the corresponding stage line
 *   - Between stage changes (every ~6.5s while still in same stage) →
 *     speak a motivational
 *   - On stage='complete' or isGenerating=false → cancel and clear
 *
 * The exposed `currentLine` lets the orb caption track what the voice
 * is saying, so the user reads + hears the same beat.
 */
export function useOrbVoice({ isGenerating, stage }: UseOrbVoiceInput): UseOrbVoiceOutput {
  const [currentLine, setCurrentLine] = useState('');
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const motivationalTimerRef = useRef<number | null>(null);
  const lastStageRef = useRef<GenerationStage>('idle');
  const inFlightRef = useRef<Promise<void> | null>(null);

  // Lazy-init the audio element once.
  useEffect(() => {
    audioElRef.current = new Audio();
    return () => {
      audioElRef.current?.pause();
      audioElRef.current = null;
      releaseBlob();
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

  async function speak(line: string) {
    setCurrentLine(line);
    if (!audioElRef.current) return;
    // If something is mid-fetch or mid-play, drop it — newer line wins.
    audioElRef.current.pause();
    releaseBlob();

    const myFetch = (async () => {
      try {
        const blob = await fetchVoiceAudio(line);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        if (!audioElRef.current) return;
        audioElRef.current.src = url;
        await audioElRef.current.play();
      } catch (err) {
        // Silent fail — voice is decoration, not load-bearing. Caption
        // still updates so the user gets the visible status.
        console.warn('Orb voice fetch failed', err);
      }
    })();
    inFlightRef.current = myFetch;
  }

  // Schedule the next motivational while we're still in the same stage.
  function scheduleMotivational(stageAtSchedule: GenerationStage) {
    clearMotivationalTimer();
    motivationalTimerRef.current = window.setTimeout(() => {
      // Only speak if still in the same stage AND still generating.
      if (lastStageRef.current === stageAtSchedule && stageAtSchedule !== 'complete' && stageAtSchedule !== 'idle') {
        void speak(pickMotivational());
        scheduleMotivational(stageAtSchedule);
      }
    }, MOTIVATIONAL_GAP_MS);
  }

  // Drive on stage / isGenerating changes.
  useEffect(() => {
    if (!isGenerating || stage === 'complete' || stage === 'idle') {
      clearMotivationalTimer();
      audioElRef.current?.pause();
      releaseBlob();
      setCurrentLine('');
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

  return { currentLine };
}
