import { useEffect, useRef, useState, type ReactNode } from 'react';

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
 * bottom. The card hosts either the DiveLoader (while gen runs) or the
 * dive's own LearningContentDisplay (once stage='complete').
 *
 * Visual continuity is the point: the parent stays visible behind the
 * scrim so the user understands the dive is layered ON the parent, not
 * a screen replacement. Popping the sheet reveals the parent in the same
 * scroll/section state it was left in.
 */
export function DiveSheet({ onClose, children }: DiveSheetProps) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // One-frame delay so the slide-up transition actually animates on mount.
  // Without this the card renders straight at translate-y-0 and there's no
  // visible enter animation.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

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
      {/* Backdrop scrim — clicking it closes the sheet (parens of the
          stacking metaphor: tap-outside-to-dismiss). */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet card — slides up from the bottom. Top inset of 3rem leaves
          a sliver of the parent visible above the card so the stacking is
          immediately legible. */}
      <div
        ref={cardRef}
        className={`absolute inset-x-0 bottom-0 top-12 bg-dark-900 border-t border-dark-700 rounded-t-2xl shadow-2xl overflow-hidden flex flex-col transform transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
