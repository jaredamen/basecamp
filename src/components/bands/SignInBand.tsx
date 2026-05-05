import { motion } from 'framer-motion';
import { signInWithGoogle } from '../../services/managedAuth';

/**
 * Hero CTA for unauthenticated visitors. Sits below the orb, above the
 * landing-page sections. Marc Lou-style: punchy headline + subheadline +
 * single CTA with a quiet sub-CTA reassurance line.
 */
export function SignInBand() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-5 max-w-xl mx-auto text-center"
    >
      <h1 className="text-3xl sm:text-4xl font-semibold text-solar-100 leading-tight">
        Listen to anything. <span className="text-solar-gold">Remember it.</span>
      </h1>
      <p className="text-solar-400 text-base leading-relaxed">
        Paste any topic, hear an expert briefing tailored to how you think,
        then drill the key ideas with mid-listen recall checkpoints.
      </p>

      <motion.button
        onClick={signInWithGoogle}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="glass rounded-full px-6 py-3 flex items-center gap-3 text-solar-100 hover:border-solar-gold/40 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="font-medium">Continue with Google</span>
      </motion.button>

      <p className="text-[10px] text-solar-500 font-mono uppercase tracking-wider">
        free $0.50 included · no credit card required
      </p>
    </motion.div>
  );
}
