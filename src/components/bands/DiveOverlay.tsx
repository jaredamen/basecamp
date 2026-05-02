import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface DiveOverlayProps {
  /** Pop the dive (ESC, "← Back to parent" pill, or backdrop click). */
  onClose: () => void;
  children: ReactNode;
}

/**
 * Replaces the old DiveSheet slide-up metaphor. Now that the orb is
 * persistent and renders an inner concentric ring while in a dive
 * (`SolarFlare inDive={true}`), the dive content materialises as a
 * glass panel that fades in beside/over the parent's ContextBand —
 * not a sheet sliding from below.
 *
 * The user reads "you went deeper" from the orb's behaviour (inner ring
 * blooms in) + the panel fading in. Popping the dive: inner ring
 * retracts, panel fades out, parent band fades back in.
 */
export function DiveOverlay({ onClose, children }: DiveOverlayProps) {
  // ESC closes the dive — convenient if the user wants to bail mid-load.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    // Absolutely position so the dive panel covers the parent band but the
    // orb (rendered in a sibling column) stays visible + interactive on
    // its own. The dive panel slot lives in the same column as the band
    // it's replacing.
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="absolute inset-0 z-10"
      role="dialog"
      aria-modal="true"
      aria-label="Deep dive"
    >
      {/* Click-to-dismiss backdrop on the band area — fades the parent
          band beneath without obscuring the orb in its own column. */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-solar-900/40 backdrop-blur-sm rounded-2xl"
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
