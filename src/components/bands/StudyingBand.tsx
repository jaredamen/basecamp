import { motion } from 'framer-motion';
import type { FlashcardSet } from '../../services/aiPrompting';
import { FlashcardDisplay } from '../FlashcardDisplay';

interface StudyingBandProps {
  flashcardSet: FlashcardSet;
  briefingId: string;
  parentContent: string;
  onDeepDive: (selection: string) => void;
  onAnalogyUpdated: (cardId: string, newExplanation: string) => void;
  onComplete?: () => void;
}

/**
 * Study-cards band — the FlashcardDisplay's deck-walk UI rendered as a
 * panel beside the orb (no fullscreen wrapper). Cross-fades on enter/exit
 * via AnimatePresence in the parent.
 */
export function StudyingBand(props: StudyingBandProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <FlashcardDisplay {...props} />
    </motion.div>
  );
}
