import { motion } from 'framer-motion';
import { Headphones, Sparkles, Brain } from 'lucide-react';

/**
 * Animated demo visualization that lives between the hero and the
 * how-it-works grid. Shows the three product beats in sequence:
 *   1. Paste a URL — textarea types itself out
 *   2. Listen — orb pulses, sound waves emanate
 *   3. Recall — quiz card slides in
 *
 * Built entirely from CSS + framer-motion (no GIFs/MP4s, no asset
 * hosting). Loops every ~12 seconds.
 *
 * Replaces the prior dead "scroll for the demo" promise — there's
 * actually a demo now.
 */
export function DemoStrip() {
  return (
    <section className="relative">
      <div className="text-center space-y-2 max-w-2xl mx-auto mb-8">
        <div className="text-xs text-solar-gold font-mono uppercase tracking-wider">demo</div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-solar-100 leading-tight">
          What it actually feels like.
        </h2>
      </div>

      <div className="relative glass rounded-3xl p-6 sm:p-10 overflow-hidden min-h-[320px] sm:min-h-[360px]">
        {/* Three beats — each fades in/out on its 12s cycle window. */}
        <PasteBeat />
        <ListenBeat />
        <RecallBeat />

        {/* Beat indicator dots. */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {[0, 1, 2].map((i) => (
            <BeatDot key={i} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BeatDot({ index }: { index: number }) {
  return (
    <motion.span
      className="block h-1.5 rounded-full bg-solar-gold/40"
      animate={{
        width: ['6px', '6px', '24px', '6px', '6px'],
        backgroundColor: [
          'rgba(255,215,0,0.25)',
          'rgba(255,215,0,0.25)',
          'rgba(255,215,0,1)',
          'rgba(255,215,0,0.25)',
          'rgba(255,215,0,0.25)',
        ],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: 'easeInOut',
        times: [0, index * 0.333, index * 0.333 + 0.16, index * 0.333 + 0.32, 1],
      }}
    />
  );
}

/** Beat 1 (0–4s): a faux URL types into a textarea. */
function PasteBeat() {
  const url = 'https://en.wikipedia.org/wiki/Stoicism';
  return (
    <motion.div
      className="absolute inset-x-6 sm:inset-x-10 top-6 sm:top-10 flex flex-col items-center justify-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Sparkles className="w-6 h-6 text-solar-gold" />
      <div className="w-full max-w-md bg-solar-900/60 border border-solar-gold/25 rounded-xl px-4 py-3 font-mono text-sm text-solar-100">
        <TypingLine text={url} cycleSeconds={12} startAt={0.04} endAt={0.30} />
      </div>
      <div className="text-xs text-solar-500 font-mono uppercase tracking-wider">
        paste a URL · type a topic · or drop in your own text
      </div>
    </motion.div>
  );
}

/** Beat 2 (4–8s): orb pulses + sound waves emanate; caption shows section progress. */
function ListenBeat() {
  return (
    <motion.div
      className="absolute inset-x-6 sm:inset-x-10 top-6 sm:top-10 flex flex-col items-center justify-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer glow rings — three concentric expanding waves */}
        {[0, 0.4, 0.8].map((delay, i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border border-solar-gold/60"
            animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay }}
          />
        ))}
        {/* Orb body */}
        <motion.div
          className="w-16 h-16 rounded-full bg-gradient-to-br from-solar-gold to-solar-amber"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 40px rgba(255,215,0,0.5)' }}
        />
        <Headphones className="absolute w-6 h-6 text-solar-900 pointer-events-none" />
      </div>
      <div className="text-xs text-solar-gold font-mono uppercase tracking-wider">
        section 2 of 5 · listening
      </div>
    </motion.div>
  );
}

/** Beat 3 (8–12s): quiz card slides in over the orb area. */
function RecallBeat() {
  return (
    <motion.div
      className="absolute inset-x-6 sm:inset-x-10 top-6 sm:top-10 flex justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className="w-full max-w-md glass-strong rounded-2xl p-5 space-y-3"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: [20, 0, 0, 20], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', times: [0.55, 0.6, 0.85, 0.9] }}
      >
        <div className="flex items-center gap-2 text-solar-gold text-xs font-mono font-semibold uppercase tracking-wider">
          <Brain className="w-3 h-3" />
          recall checkpoint
        </div>
        <p className="text-base font-semibold text-solar-100 leading-snug">
          What is the dichotomy of control?
        </p>
        <div className="space-y-2">
          {['Focus only on what you control', 'Control everything around you', 'Avoid all decisions'].map((opt, i) => (
            <div
              key={i}
              className={`text-sm px-3 py-2 rounded-lg border ${
                i === 0
                  ? 'border-solar-gold/40 bg-solar-gold/10 text-solar-100'
                  : 'border-solar-gold/10 bg-solar-700/40 text-solar-400'
              }`}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Renders a string that types itself character-by-character and then
 * holds, on the cycle window [startAt, endAt] (fractions of cycleSeconds).
 */
function TypingLine({
  text,
  cycleSeconds,
  startAt,
  endAt,
}: {
  text: string;
  cycleSeconds: number;
  startAt: number;
  endAt: number;
}) {
  const charSteps = Array.from({ length: text.length + 1 }, (_, i) => text.slice(0, i));
  // The first frame is empty; ramp through chars across the window;
  // hold the last frame until endAt; then back to empty.
  const times = [
    0,
    startAt,
    startAt + (endAt - startAt) * 0.5,
    endAt,
    Math.min(1, endAt + 0.001),
  ];
  return (
    <motion.span
      animate={{
        textShadow: ['0 0 0 transparent', '0 0 0 transparent'],
      }}
      transition={{ duration: cycleSeconds, repeat: Infinity, ease: 'linear' }}
    >
      <motion.span
        animate={{
          // Use opacity to drive a discrete-ish reveal: hand-roll via text content.
          // We can't animate text content; use a series of spans staggered by visibility.
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{ duration: cycleSeconds, repeat: Infinity, ease: 'linear', times }}
      >
        {charSteps.length > 1 && (
          <TypewriterReveal text={text} duration={cycleSeconds} startAt={startAt} endAt={endAt} />
        )}
      </motion.span>
    </motion.span>
  );
}

/** Pure framer keyframes can't render different text values, so we lay
 *  out all char-prefixes stacked and toggle their visibility with
 *  staggered animations. Crude but works without JS state. */
function TypewriterReveal({
  text,
  duration,
  startAt,
  endAt,
}: {
  text: string;
  duration: number;
  startAt: number;
  endAt: number;
}) {
  const window = endAt - startAt;
  const perChar = window / text.length;
  return (
    <span className="inline-block">
      {Array.from(text).map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'linear',
            times: [
              0,
              Math.min(1, startAt + perChar * i),
              Math.min(1, startAt + perChar * (i + 1)),
              Math.min(1, endAt),
              Math.min(1, endAt + 0.001),
            ],
          }}
        >
          {char === ' ' ? ' ' : char}
        </motion.span>
      ))}
    </span>
  );
}
