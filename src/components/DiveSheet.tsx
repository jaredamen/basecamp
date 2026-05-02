import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface DiveSheetProps {
  /** Closes the sheet (e.g. user pressed ESC or clicked backdrop). The dive
   *  exit also pops via the in-sheet "← Back to parent" pill rendered by
   *  LearningContentDisplay. */
  onClose: () => void;
  children: ReactNode;
}

/**
 * Stacked-sheet shell for the dive flow. Renders a dimmed backdrop over the
 * parent's LearningContentDisplay, with an inner card sliding up from the
 * bottom (Framer-driven so the easing matches the rest of the app).
 *
 * Visual continuity is the point: the parent stays visible behind the
 * scrim so the user understands the dive is layered ON the parent, not
 * a screen replacement. Popping the sheet reveals the parent in the same
 * scroll/section state it was left in.
 */
export function DiveSheet({ onClose, children }: DiveSheetProps) {
  // ESC closes the sheet. Convenient when the user mashed it to bail out
  // of a dive that's still loading.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Deep dive">
      {/* Backdrop scrim — clicking it closes the sheet. */}
      <motion.div
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      {/* Sheet card — slides up from the bottom with the global spring
          default (snappy without overshoot). Top inset of 3rem leaves a
          sliver of the parent visible above the card so the stacking is
          immediately legible. */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="absolute inset-x-0 bottom-0 top-12 glass-strong rounded-t-2xl overflow-hidden flex flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
}
