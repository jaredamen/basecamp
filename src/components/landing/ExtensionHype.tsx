import { motion } from 'framer-motion';
import { Puzzle, Sparkles } from 'lucide-react';

/**
 * "Coming soon" banner for the Chrome extension. Sits between
 * WhyItExists and Pricing on the landing page. No backend behind it
 * (no waitlist signup yet) — just a styled hype block so visitors know
 * the extension is in flight.
 */
export function ExtensionHype() {
  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4 }}
        className="glass-strong rounded-3xl p-6 sm:p-10 max-w-3xl mx-auto relative overflow-hidden"
      >
        {/* Gold accent ribbon */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-solar-gold/60 to-transparent"
        />

        <div className="flex items-start gap-5 relative">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-solar-gold/15 border border-solar-gold/40 flex items-center justify-center flex-shrink-0">
            <Puzzle className="w-6 h-6 sm:w-7 sm:h-7 text-solar-gold" />
            <motion.span
              className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-solar-amber"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-3 h-3 text-solar-900" />
            </motion.span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-solar-amber font-mono uppercase tracking-wider bg-solar-amber/15 border border-solar-amber/40 rounded-full px-2 py-0.5">
                coming soon
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-solar-100 leading-tight">
              Chrome extension launching soon
            </h3>
            <p className="text-sm sm:text-base text-solar-400 leading-relaxed">
              Send any article straight from your browser to basecamp — one click on the page you're reading, and an audio briefing is waiting in your library by the time you reach for headphones.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
