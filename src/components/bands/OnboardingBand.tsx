import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveProfile, type UserProfile } from '../../services/userProfile';

interface OnboardingBandProps {
  /** Called when the user completes (or skips) the 2-question flow.
   *  The profile has been persisted to localStorage by then. */
  onComplete: (profile: UserProfile) => void;
  /** Notifies the parent (App) of step changes so the orb's caption
   *  above the band can mirror the current question. */
  onStepChange?: (stepIndex: number) => void;
}

interface Step {
  key: 'name' | 'expertise';
  label: string;
  placeholder: string;
  /** Optional chip suggestions — the user can tap one to fill in. */
  suggestions?: string[];
}

const STEPS: Step[] = [
  {
    key: 'name',
    label: 'Your name',
    placeholder: 'e.g. Jared',
  },
  {
    key: 'expertise',
    label: 'What do you know well?',
    placeholder: 'or type your own…',
    // Diverse domains — picked to span work + hobbies so most users
    // find one that fits in <2 seconds. Fallback to free-text if not.
    suggestions: [
      'Software engineering',
      'Sports',
      'Music',
      'Cooking',
      'Movies & TV',
      'Gaming',
      'Business',
      'Science',
      'History',
      'Art & design',
      'Reading',
      'Health & fitness',
    ],
  },
];

/**
 * Slimmer orb-led onboarding flow. Two questions — name + expertise.
 * The orb above (driven from App-level via the orbCaption prop) cycles
 * its caption to match the current step. The expertise step has a
 * prominent chip grid so users pick something in seconds rather than
 * getting stuck staring at a blank field.
 *
 * On completion, `userProfile.saveProfile()` writes to localStorage
 * (with empty profession + intent fields, which the audience block
 * gracefully omits). The audience-bridge in prompts is keyed on
 * `expertise` — that's the load-bearing field for tailored analogies.
 */
export function OnboardingBand({ onComplete, onStepChange }: OnboardingBandProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({ name: '', expertise: '' });
  const [draft, setDraft] = useState('');

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  useEffect(() => {
    onStepChange?.(stepIndex);
  }, [stepIndex, onStepChange]);

  const advance = (skip: boolean = false) => {
    const value = skip ? '' : draft.trim();
    const nextAnswers = { ...answers, [step.key]: value };
    setAnswers(nextAnswers);
    setDraft('');

    if (isLast) {
      // Save with empty profession + intent — they're optional in the
      // audience block. Only the populated fields appear in prompts.
      const profile = saveProfile({
        name: nextAnswers.name,
        profession: '',
        expertise: nextAnswers.expertise,
        intent: '',
      });
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

          {/* Suggestion chips on the expertise step — prominent, above
              the input so the user picks from them first and only types
              a custom answer if nothing fits. */}
          {step.suggestions && step.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {step.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft(s)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    draft === s
                      ? 'bg-solar-gold text-solar-900 border-solar-gold'
                      : 'bg-solar-amber/15 border-solar-amber/40 text-solar-amber hover:bg-solar-amber/25'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={step.placeholder}
            autoFocus
            className="w-full bg-solar-900/50 border border-solar-gold/15 rounded-lg px-4 py-3 text-solar-100 text-base focus:border-solar-gold focus:ring-1 focus:ring-solar-gold outline-none transition-colors"
            maxLength={200}
          />

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

      <p className="text-[10px] text-solar-500 font-mono uppercase tracking-wider text-center">
        the more I know, the better the analogies
      </p>
    </motion.div>
  );
}
