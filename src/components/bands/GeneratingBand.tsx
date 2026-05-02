import { motion } from 'framer-motion';
import { LoadingIndicator } from '../LoadingIndicator';

interface GeneratingBandProps {
  stage: 'idle' | 'fetching' | 'analyzing' | 'flashcards' | 'audio' | 'diving' | 'reframing' | 'complete';
  progress: number;
  error?: string;
  insufficientCredits?: boolean;
  onRetry?: () => void;
  onAddCredits?: () => void;
}

/**
 * Generation-in-flight band — wraps LoadingIndicator now that its
 * fullscreen wrapper is stripped. The orb beside the band runs in
 * `Loading` state with a ring fill matching the progress.
 */
export function GeneratingBand(props: GeneratingBandProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <LoadingIndicator {...props} />
    </motion.div>
  );
}
