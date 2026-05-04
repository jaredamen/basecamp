/**
 * Visible-surface feature flags. The SLC launch hides everything except
 * the core feature: paste a topic → hear an audio briefing → mid-listen
 * flashcard checkpoints lock in the key ideas. Power features stay in
 * the codebase intact (state machine, prompts, components are all
 * preserved); they're just hidden from the UI until v2.
 *
 * To re-enable a feature in v2: flip the boolean to `true`. No other
 * changes needed.
 *
 * Note: onboarding is NOT flagged here — it's load-bearing for the
 * profile-aware prompts (audience-bridge analogies). The lighter
 * 2-question onboarding stays visible for everyone.
 */
export const FEATURES = {
  /** Library tab in AppHeader + the LibraryBand route. Briefings still
   *  auto-save to localStorage; users just don't see a way to revisit
   *  them. v2: re-enable for paid users. */
  showLibrary: false,

  /** "Different analogy" button in ListeningBand that reframes the
   *  audio with a fresh palette. Power feature. v2: paid users. */
  showReframe: false,

  /** Dive chips on QuizPanel + FlashcardDisplay study mode. Recursive
   *  dive flow stays wired but no entry point. v2: paid users. */
  showDive: false,

  /** Audio ↔ Study Cards toggle in ContentBand. When false, the band
   *  always shows ListeningBand. Study mode is reachable only via the
   *  audio's mid-listen checkpoints — which IS the lock-in mechanism
   *  we want to feature. v2: re-enable as a power-user toggle. */
  showStudyCardsToggle: false,
} as const;
