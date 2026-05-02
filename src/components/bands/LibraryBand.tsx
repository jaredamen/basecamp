import { motion } from 'framer-motion';
import { LibraryView } from '../LibraryView';
import type { SavedBriefing } from '../../services/briefingLibrary';

interface LibraryBandProps {
  onOpen: (briefing: SavedBriefing) => void;
  onBack: () => void;
}

/**
 * Saved-briefings band — wraps LibraryView (now without its fullscreen
 * container). Each briefing is a glowing chip the user can summon back
 * into the orb's audio context.
 */
export function LibraryBand(props: LibraryBandProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <LibraryView {...props} />
    </motion.div>
  );
}
