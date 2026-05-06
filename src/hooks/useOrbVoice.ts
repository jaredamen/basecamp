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
 * **Continuity contract** (the reason for the queue): stage transitions
 * during fast generation can fire 2–4 times in seconds. Earlier code
 * paused the in-flight line on every transition, producing audible
 * mid-sentence cuts. Now stage lines QUEUE — current line plays to its
 * natural end, then the queue drains. Multiple stage transitions during
 * one in-flight line coalesce: the queue holds at most 1 line, and only
 * the LATEST queued line plays (older queued lines are silently dropped
 * — we don't want to play 3 stale stage lines back-to-back).
 *
 * Motivationals (filler) get dropped instead of queued — they're
 * non-essential, so we don't want them clogging the queue.
 *
 * State machine:
 *   - On stage change → queue the corresponding stage line
 *   - Between stage changes (every ~6.5s while still in same stage) →
 *     try to speak a motivational; drop if already speaking
 *   - On stage='complete' or isGenerating=false → STOP scheduling new
 *     lines, but let the current spoken line + queued line finish
 *     naturally. App.tsx watches `isSpeaking` and defers the visual
 *     transition to the content view until everything has played.
 */
export function useOrbVoice({ isGenerating, stage }: UseOrbVoiceInput): UseOrbVoiceOutput {
  const [currentLine, setCurrentLine] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const motivationalTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const lastStageRef = useRef<GenerationStage>('idle');
  /** Mirror of isSpeaking that's safe to read from async speak(). React
   *  state can't be read mid-flight; this ref always reflects "right now". */
  const isSpeakingRef = useRef(false);
  /** Single-slot queue. Holds the LATEST stage line that arrived while
   *  another line was still playing. Drained by handleFinish(). */
  const pendingLineRef = useRef<string | null>(null);

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

  function handleFinish() {
    clearSafetyTimer();
    releaseBlob();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setCurrentLine('');

    // Drain the queue if a stage line was waiting.
    const queued = pendingLineRef.current;
    if (queued) {
      pendingLineRef.current = null;
      void speak(queued, { queue: true });
    }
  }

  /**
   * Speak a line — but never interrupt one that's already playing.
   *
   * @param line  the text to speak
   * @param opts  `queue: true` (default) — if currently speaking, store
   *              this line as the next one to play (overwriting any
   *              prior queued line). `queue: false` — drop silently if
   *              currently speaking. Motivationals pass `queue: false`.
   */
  async function speak(line: string, opts: { queue?: boolean } = {}) {
    const { queue = true } = opts;

    if (isSpeakingRef.current) {
      if (queue) pendingLineRef.current = line;
      return;
    }

    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setCurrentLine(line);
    clearSafetyTimer();

    if (!audioElRef.current) {
      handleFinish();
      return;
    }

    try {
      const blob = await fetchVoiceAudio(line);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      const el = audioElRef.current;
      if (!el) {
        handleFinish();
        return;
      }
      el.src = url;
      el.onended = handleFinish;
      el.onerror = handleFinish;
      // Belt-and-suspenders: cap how long isSpeaking can stay true.
      // Without this, a stuck `ended` event would lock the App-level
      // content transition indefinitely.
      safetyTimerRef.current = window.setTimeout(handleFinish, SPEECH_MAX_MS);
      await el.play();
    } catch (err) {
      // Silent fail on voice fetch — caption already shows the line
      // visually. Drain via handleFinish so any queued line still plays.
      console.warn('Orb voice fetch failed', err);
      handleFinish();
    }
  }

  // Schedule the next motivational while we're still in the same stage.
  // Motivationals don't queue — if a stage line is playing, they drop.
  function scheduleMotivational(stageAtSchedule: GenerationStage) {
    clearMotivationalTimer();
    motivationalTimerRef.current = window.setTimeout(() => {
      if (lastStageRef.current === stageAtSchedule && stageAtSchedule !== 'complete' && stageAtSchedule !== 'idle') {
        void speak(pickMotivational(), { queue: false });
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

    // Stage actually changed — queue the new stage line. If a prior
    // line is still playing, this overwrites any older queued line and
    // plays after the current one finishes.
    if (lastStageRef.current !== stage) {
      lastStageRef.current = stage;
      const line = pickStageLine(stage);
      if (line) {
        void speak(line, { queue: true });
      }
      scheduleMotivational(stage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, stage]);

  return { currentLine, isSpeaking };
}
