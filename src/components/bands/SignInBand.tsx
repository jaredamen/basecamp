import { motion } from 'framer-motion';
import { BYOKSetupFlow } from '../BYOKSetupFlow';

interface SignInBandProps {
  onComplete: () => void;
}

/**
 * Sign-in band — wraps the BYOK setup flow without its fullscreen
 * container so it composes into the orb-centric ContextBand.
 */
export function SignInBand({ onComplete }: SignInBandProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <BYOKSetupFlow onComplete={onComplete} />
    </motion.div>
  );
}
