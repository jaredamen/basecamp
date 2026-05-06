import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { saveProfile, type UserProfile } from '../../services/userProfile';

interface OnboardingBandProps {
  /** Called when the user completes (or skips) the 2-question flow.
   *  The profile has been persisted to localStorage by then. */
  onComplete: (profile: UserProfile) => void;
  /** Notifies the parent (App) of step changes so the orb's caption
   *  above the band can mirror the current question. */
  onStepChange?: (stepIndex: number) => void;
}

const SUGGESTIONS = [
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
];

const MAX_TAGS = 6;

/**
 * Slimmer orb-led onboarding flow. Two questions — name + expertise.
 * The orb above (driven from App-level via the orbCaption prop) cycles
 * its caption to match the current step.
 *
 * Expertise is multi-select: users tap multiple chips to build a list of
 * familiar domains the LLM will vary analogies across. Free-text input
 * adds custom tags on Enter. Up to MAX_TAGS = 6.
 *
 * On completion, `userProfile.saveProfile()` writes to localStorage
 * (with empty profession + intent fields, which the audience block
 * gracefully omits).
 */
export function OnboardingBand({ onComplete, onStepChange }: OnboardingBandProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  const isNameStep = stepIndex === 0;
  const isLast = stepIndex === 1;
  const canAdvance = isNameStep ? draft.trim().length > 0 : expertise.length > 0;

  useEffect(() => {
    onStepChange?.(stepIndex);
  }, [stepIndex, onStepChange]);

  const advance = (skip: boolean = false) => {
    if (isNameStep) {
      const value = skip ? '' : draft.trim();
      setName(value);
      setDraft('');
      setStepIndex(1);
      return;
    }

    // Last step: build profile, persist, hand off.
    const profile = saveProfile({
      name,
      profession: '',
      expertise: skip ? [] : expertise,
      intent: '',
    });
    onComplete(profile);
  };

  const toggleTag = (tag: string) => {
    setExpertise((prev) => {
      const lc = tag.toLowerCase();
      const has = prev.some((t) => t.toLowerCase() === lc);
      if (has) return prev.filter((t) => t.toLowerCase() !== lc);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const removeTag = (tag: string) => {
    setExpertise((prev) => prev.filter((t) => t !== tag));
  };

  const addCustomTag = () => {
    const v = draft.trim();
    if (!v) return;
    toggleTag(v);
    setDraft('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNameStep) {
      if (!draft.trim()) return;
      advance(false);
      return;
    }
    // Expertise step: Enter in input → add custom tag; if input empty,
    // treat Enter as "Continue".
    if (draft.trim()) {
      addCustomTag();
      return;
    }
    if (expertise.length > 0) advance(false);
  };

  const isTagSelected = (tag: string) =>
    expertise.some((t) => t.toLowerCase() === tag.toLowerCase());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-5 max-w-md mx-auto"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[0, 1].map((idx) => (
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
          key={isNameStep ? 'name' : 'expertise'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          onSubmit={handleSubmit}
          className="w-full glass rounded-2xl p-5 space-y-3"
        >
          <label className="block text-xs font-mono text-solar-500 uppercase tracking-wider">
            {isNameStep ? 'Your name' : 'What do you know well?'}
          </label>

          {/* Expertise step: pills row + chip grid + free-text input. */}
          {!isNameStep && (
            <>
              {expertise.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {expertise.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-solar-gold text-solar-900 border border-solar-gold font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Remove ${tag}`}
                        className="hover:bg-solar-900/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pb-1">
                {SUGGESTIONS.map((s) => {
                  const selected = isTagSelected(s);
                  const atCap = !selected && expertise.length >= MAX_TAGS;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleTag(s)}
                      aria-pressed={selected}
                      disabled={atCap}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        selected
                          ? 'bg-solar-gold text-solar-900 border-solar-gold'
                          : atCap
                            ? 'bg-solar-700 border-solar-gold/10 text-solar-500 cursor-not-allowed'
                            : 'bg-solar-amber/15 border-solar-amber/40 text-solar-amber hover:bg-solar-amber/25'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isNameStep ? 'your first name' : 'add your own — press Enter'}
            autoFocus
            className="w-full bg-solar-900/50 border border-solar-gold/15 rounded-lg px-4 py-3 text-solar-100 text-base focus:border-solar-gold focus:ring-1 focus:ring-solar-gold outline-none transition-colors"
            maxLength={50}
            disabled={!isNameStep && expertise.length >= MAX_TAGS}
          />

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={!canAdvance && !draft.trim()}
              className="flex-1 px-4 py-2.5 bg-solar-gold hover:bg-solar-amber disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed text-solar-900 rounded-lg font-medium transition-colors"
            >
              {isLast ? (draft.trim() ? 'Add' : 'Start learning') : 'Continue'}
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
        {isNameStep
          ? 'so the orb can address you'
          : 'pick a few — analogies bridge to what you already know'}
      </p>
    </motion.div>
  );
}
