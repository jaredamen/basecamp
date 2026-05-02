import { motion } from 'framer-motion';
import { DocumentationInput } from '../DocumentationInput';

interface TopicInputBandProps {
  onGenerate: (input: { url?: string; text?: string; type: 'url' | 'text' }) => void;
  isGenerating?: boolean;
}

/**
 * Topic input band — the URL/text input + example chips, rendered as a
 * panel in the orb-centric ContextBand. Reuses DocumentationInput now
 * that its fullscreen wrapper has been stripped.
 */
export function TopicInputBand(props: TopicInputBandProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <DocumentationInput {...props} />
    </motion.div>
  );
}
