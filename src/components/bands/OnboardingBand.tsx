import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveProfile, type UserProfile } from '../../services/userProfile';

interface OnboardingBandProps {
  /** Called when the user completes (or skips through) the 4-question
   *  flow. The profile has been persisted to localStorage by then. */
  onComplete: (profile: UserProfile) => void;
  /** Notifies the parent (App) of step changes so the orb's caption
   *  above the band can mirror the current question. */
  onStepChange?: (stepIndex: number) => void;
}

interface Step {
  key: 'name' | 'profession' | 'expertise' | 'intent';
  /** What the orb caption ABOVE the band shows during this step. */
  caption: string;
  /** The label rendered above the input slot. */
  label: string;
  placeholder: string;
  /** Optional chip suggestions — the user can tap one to fill in. */
  suggestions?: string[];
}

const STEPS: Step[] = [
  {
    key: 'name',
    caption: 'first — what should I call you?',
    label: 'Your name',
    placeholder: 'e.g. Jared',
  },
  {
    key: 'profession',
    caption: 'good. and what do you do?',
    label: 'Your profession',
    placeholder: 'e.g. software engineer',
    suggestions: ['Engineer', 'Teacher', 'Student', 'Doctor', 'Designer', 'Writer', 'Manager'],
  },
  {
    key: 'expertise',
    caption: 'a domain or hobby you know really well?',
    label: 'A domain you know',
    placeholder: 'e.g. jiu-jitsu, distributed systems, cooking',
  },
  {
    key: 'intent',
    caption: 'last one — what brings you here today?',
    label: 'What brings you here',
    placeholder: 'e.g. exploring stoicism, refreshing on linear algebra',
  },
];

/**
 * Orb-led onboarding flow. Four short questions, each as its own step.
 * The orb above (driven from App-level via the orbCaption prop) cycles
 * its caption to match the current step's question. The user types
 * (or skips) and advances.
 *
 * On completion, `userProfile.saveProfile()` writes to localStorage and
 * the `onComplete` callback fires. Each subsequent LLM prompt then
 * embeds an `<audience>` block with the profile so analogies bridge to
 * the user's known domains.
 */
export function OnboardingBand({ onComplete, onStepChange }: OnboardingBandProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({
    name: '',
    profession: '',
    expertise: '',
    intent: '',
  });
  const [draft, setDraft] = useState('');

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // Tell the parent (App) what step we're on so the orb caption above
  // the band mirrors the current question.
  useEffect(() => {
    onStepChange?.(stepIndex);
  }, [stepIndex, onStepChange]);

  const advance = (skip: boolean = false) => {
    const value = skip ? '' : draft.trim();
    const nextAnswers = { ...answers, [step.key]: value };
    setAnswers(nextAnswers);
    setDraft('');

    if (isLast) {
      const profile = saveProfile(nextAnswers);
      onComplete(profile);
      return;
    }
    setStepIndex(stepIndex + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    advance(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-5 max-w-md mx-auto"
    >
      {/* Step indicator — small mono dots above the form */}
      <div className="flex items-center gap-2">
        {STEPS.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === stepIndex
                ? 'w-6 bg-solar-gold'
                : idx < stepIndex
                  ? 'w-1.5 bg-solar-gold/60'
                  : 'w-1.5 bg-solar-gold/15'
            }`}
          />
        ))}
      </div>

      {/* Glass input slot — the question lives in the orb caption above
          this band, so we don't repeat it here. We do show a small label
          for the form field. */}
      <AnimatePresence mode="wait">
        <motion.form
          key={step.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          onSubmit={handleSubmit}
          className="w-full glass rounded-2xl p-5 space-y-3"
        >
          <label className="block text-xs font-mono text-solar-500 uppercase tracking-wider">
            {step.label}
          </label>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={step.placeholder}
            autoFocus
            className="w-full bg-solar-900/50 border border-solar-gold/15 rounded-lg px-4 py-3 text-solar-100 text-base focus:border-solar-gold focus:ring-1 focus:ring-solar-gold outline-none transition-colors"
            maxLength={200}
          />

          {/* Suggestion chips for the profession step. */}
          {step.suggestions && step.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {step.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-solar-amber/15 border border-solar-amber/40 text-solar-amber hover:bg-solar-amber/25 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={!draft.trim()}
              className="flex-1 px-4 py-2.5 bg-solar-gold hover:bg-solar-amber disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed text-solar-900 rounded-lg font-medium transition-colors"
            >
              {isLast ? 'Start learning' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={() => advance(true)}
              className="text-xs text-solar-500 hover:text-solar-100 transition-colors font-mono uppercase tracking-wider"
            >
              Skip
            </button>
          </div>
        </motion.form>
      </AnimatePresence>

      <p className="text-[10px] text-solar-500 font-mono uppercase tracking-wider">
        the more I know, the better the analogies
      </p>
    </motion.div>
  );
}
