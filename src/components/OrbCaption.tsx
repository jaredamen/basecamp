import { motion, AnimatePresence } from 'framer-motion';

interface OrbCaptionProps {
  /** The caption text. Empty/undefined hides the caption entirely. */
  text?: string;
}

/**
 * Mono-spaced caption that floats just under the orb. Cross-fades on text
 * change so the readout glides instead of snapping. JARVIS instrument-
 * panel tone: lowercase or sentence-case, never SHOUTING.
 *
 * Examples:
 *   "ready · paste a topic"
 *   "section 2 of 6 · listening"
 *   "diving into 'dichotomy of control'…"
 *   "re-framing analogy…"
 */
export function OrbCaption({ text }: OrbCaptionProps) {
  return (
    <div className="min-h-[20px] mt-4 flex items-center justify-center px-3">
      <AnimatePresence mode="wait" initial={false}>
        {text && (
          <motion.span
            key={text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 0.85, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="font-mono text-xs tracking-wider text-solar-gold/85 select-none text-center max-w-[90vw]"
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
