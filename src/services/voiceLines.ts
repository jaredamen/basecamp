/**
 * Lines the JARVIS orb speaks during generation. State-line bank tied
 * to the generation stage; motivationals pulled at random in between.
 * Static strings only — no LLM call, no prompt injection vector.
 *
 * Tone: calm, instrument-readout. Never SHOUTING. Never overwrought.
 */

import type { GenerationStage } from '../hooks/useContentGeneration';

/**
 * Status lines per generation stage. Each call picks one at random so
 * a user generating multiple briefings doesn't hear the same script.
 */
export const STAGE_LINES: Record<GenerationStage, string[]> = {
  idle: [],
  fetching: [
    'Fetching the source.',
    'Pulling the material in.',
    'Reaching out to the source.',
  ],
  analyzing: [
    'Reading through it now.',
    'Looking for the throughline.',
    'Finding what matters most.',
  ],
  audio: [
    'Composing the narrative.',
    'Picking the analogies.',
    'Writing the lesson.',
    'Finding the right way to tell this.',
  ],
  flashcards: [
    'Crafting the recall cards.',
    'Picking the most important ideas to drill.',
    'Building the active-recall set.',
  ],
  diving: [
    'Diving deeper.',
    'Following the thread.',
    'Going one layer further down.',
  ],
  reframing: [
    'Re-framing with a different analogy.',
    'Pulling a fresh parable.',
    'Trying it from another angle.',
  ],
  complete: [],
};

/**
 * Played in between stage lines while the user waits. Brain-on-learning
 * vignettes — short, calm, in-character.
 */
export const MOTIVATIONALS: readonly string[] = [
  'The brain learns best when surprised.',
  'Knowledge is rarely a straight line. Let\'s see where this one curves.',
  'Every expert was once a beginner who refused to quit.',
  'The fastest way to understand is to teach.',
  'A good analogy is half the explanation.',
  'Curiosity compounds.',
  'The hardest part of learning is unlearning.',
  'Understanding feels like remembering something you almost knew.',
  'You learn what you struggle with, not what you skim.',
  'A great teacher meets you where you are.',
  'The shortest path between confusion and clarity is usually a story.',
  'You can\'t hurry insight. But you can prepare for it.',
  'Learning is the only investment that gives compound interest forever.',
  'Three minutes of curiosity beats three hours of cramming.',
  'Every concept is connected to something you already know.',
  'The expert and the novice see the same thing differently.',
  'Patterns are easier to remember than facts.',
  'Understanding starts when the analogy clicks.',
];

export function pickStageLine(stage: GenerationStage): string | null {
  const bank = STAGE_LINES[stage];
  if (!bank || bank.length === 0) return null;
  return bank[Math.floor(Math.random() * bank.length)];
}

export function pickMotivational(): string {
  return MOTIVATIONALS[Math.floor(Math.random() * MOTIVATIONALS.length)];
}
