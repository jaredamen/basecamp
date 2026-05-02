import { motion } from 'framer-motion';
import { Play, Pause, Loader2 } from 'lucide-react';

export type FlareState = 'Idle' | 'Listening' | 'Quiz' | 'Loading';

interface SolarFlareProps {
  /**
   * Drives the visual personality of the core:
   *   Idle      — slow rotating ring, gentle gold glow (audio paused, ready)
   *   Listening — flares pulsing at ~60bpm, brighter glow (audio playing)
   *   Quiz      — motion freezes, glow turns ember (checkpoint demanding focus)
   *   Loading   — fast rotating spinner glow (TTS fetch in flight)
   */
  state: FlareState;
  /** 0..1 fill of the outer progress ring. Falls back to 0 (empty ring). */
  progress?: number;
  /** Click handler — toggles play/pause. Disabled when state is Quiz/Loading. */
  onToggle: () => void;
  /** Mirrors the previous play-button disabled state (pendingCard or fetching). */
  disabled?: boolean;
}

const RING_RADIUS = 62;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const flareVariants = {
  Idle: {
    rotate: 360,
    transition: { rotate: { duration: 30, repeat: Infinity, ease: 'linear' as const } },
  },
  Listening: {
    scale: [1, 1.06, 1],
    transition: { scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' as const } },
  },
  Quiz: {
    rotate: 0,
    scale: 1,
    transition: { duration: 0.4 },
  },
  Loading: {
    rotate: 360,
    transition: { rotate: { duration: 2, repeat: Infinity, ease: 'linear' as const } },
  },
};

const glowVariants = {
  Idle: { filter: 'drop-shadow(0 0 16px rgba(255,215,0,0.35))' },
  Listening: { filter: 'drop-shadow(0 0 28px rgba(255,215,0,0.6))' },
  Quiz: { filter: 'drop-shadow(0 0 32px rgba(255,107,53,0.75))' },
  Loading: { filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))' },
};

export function SolarFlare({ state, progress = 0, onToggle, disabled = false }: SolarFlareProps) {
  // Map state → aria-label so the existing voice-integrity E2E test
  // (`getByRole('button', { name: /^Play$|^Pause$|^Loading$/ })`) still
  // matches the centerpiece. Quiz state is internal — surfaces as "Pause"
  // since playback is suspended on a checkpoint.
  const ariaLabel = state === 'Listening'
    ? 'Pause'
    : state === 'Loading'
      ? 'Loading'
      : state === 'Quiz'
        ? 'Pause'
        : 'Play';

  // Progress ring is ember-tinted during Quiz to reinforce the "pay attention"
  // moment. Other states use the gold-amber gradient.
  const ringGradientId = state === 'Quiz' ? 'flare-ring-ember' : 'flare-ring-gold';

  return (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      animate={glowVariants[state]}
      transition={{ duration: 0.5 }}
      aria-label={ariaLabel}
      className="relative w-[140px] h-[140px] rounded-full focus:outline-none focus:ring-2 focus:ring-solar-gold/50 disabled:cursor-not-allowed group"
    >
      <svg viewBox="0 0 140 140" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="flare-ring-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FF9500" />
          </linearGradient>
          <linearGradient id="flare-ring-ember" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9500" />
            <stop offset="100%" stopColor="#FF6B35" />
          </linearGradient>
          <radialGradient id="flare-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,215,0,0.18)" />
            <stop offset="100%" stopColor="rgba(255,215,0,0)" />
          </radialGradient>
        </defs>

        {/* Inner glow disc — soft amber haze at the center */}
        <circle cx="70" cy="70" r="55" fill="url(#flare-core-glow)" />

        {/* Outer ring — track */}
        <circle
          cx="70"
          cy="70"
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,215,0,0.10)"
          strokeWidth="2.5"
        />

        {/* Outer ring — progress fill */}
        <motion.circle
          cx="70"
          cy="70"
          r={RING_RADIUS}
          fill="none"
          stroke={`url(#${ringGradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          initial={false}
          animate={{
            strokeDashoffset: RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress))),
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          transform="rotate(-90 70 70)"
        />

        {/* Flares — three teardrop shapes around the core, state-animated */}
        <motion.g
          variants={flareVariants}
          animate={state}
          initial={false}
          style={{ transformOrigin: '70px 70px' }}
        >
          {[0, 120, 240].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 70 70)`}>
              <ellipse
                cx="70"
                cy="22"
                rx="2.5"
                ry="7"
                fill={state === 'Quiz' ? 'rgba(255,107,53,0.75)' : 'rgba(255,215,0,0.6)'}
              />
            </g>
          ))}
        </motion.g>
      </svg>

      {/* Center icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        {state === 'Loading' ? (
          <Loader2 className="w-8 h-8 text-solar-gold animate-spin" />
        ) : state === 'Listening' ? (
          <Pause className="w-8 h-8 text-solar-100" fill="currentColor" />
        ) : (
          <Play className="w-8 h-8 ml-1 text-solar-100" fill="currentColor" />
        )}
      </div>
    </motion.button>
  );
}
