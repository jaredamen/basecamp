import { motion } from 'framer-motion';
import { Play, Pause, Loader2 } from 'lucide-react';

export type FlareState = 'Idle' | 'Listening' | 'Quiz' | 'Loading';

interface SolarFlareProps {
  /**
   * Drives the visual personality of the core:
   *   Idle      — slow rotating ring, gentle gold glow (audio paused, ready)
   *   Listening — flares pulsing at ~60bpm, brighter glow (audio playing)
   *   Quiz      — motion freezes, glow turns ember (checkpoint demanding focus)
   *   Loading   — fast rotating spinner glow (TTS fetch in flight, generation in flight)
   */
  state: FlareState;
  /** 0..1 fill of the outer progress ring. Falls back to 0 (empty ring). */
  progress?: number;
  /** Click handler — toggles play/pause (or a state-appropriate primary action). */
  onToggle: () => void;
  /** Mirrors the previous play-button disabled state (pendingCard / fetching). */
  disabled?: boolean;
  /**
   * Diameter in pixels. Default 220 for the JARVIS centerpiece treatment;
   * pass smaller values for compact contexts. The viewBox always renders
   * the same internal coordinate system so all sub-elements scale with it.
   */
  size?: number;
  /**
   * When true, renders an inner concentric ring + brighter core glow as
   * the visual indicator that the user is currently inside a recursive
   * dive. Replaces the slide-up DiveSheet metaphor — the orb itself shows
   * the user's "depth".
   */
  inDive?: boolean;
  /**
   * If set, renders small radial tick marks on the outer progress ring at
   * the boundaries between sections (used in Listening state to give the
   * progress ring structure — "I can see how many sections are left").
   * Pass `sections.length` from the audio briefing.
   */
  sectionMarks?: number;
}

const VIEWBOX_SIZE = 140;
const RING_RADIUS = 62;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const HALO_RADIUS = 68;
const DIVE_RING_RADIUS = 46;

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
  Idle: { filter: 'drop-shadow(0 0 18px rgba(255,215,0,0.40))' },
  Listening: { filter: 'drop-shadow(0 0 32px rgba(255,215,0,0.65))' },
  Quiz: { filter: 'drop-shadow(0 0 36px rgba(255,107,53,0.80))' },
  Loading: { filter: 'drop-shadow(0 0 22px rgba(255,215,0,0.55))' },
};

export function SolarFlare({
  state,
  progress = 0,
  onToggle,
  disabled = false,
  size = 220,
  inDive = false,
  sectionMarks,
}: SolarFlareProps) {
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
  const center = VIEWBOX_SIZE / 2;

  // Center-icon size scales with the orb so the ratio stays consistent.
  const iconPx = Math.round(size * 0.22);

  // Tick marks at section boundaries — radial line segments straddling the
  // outer progress ring. Only show when sectionMarks > 1 (no point with 1).
  const ticks: number[] = [];
  if (sectionMarks && sectionMarks > 1) {
    for (let i = 1; i < sectionMarks; i++) {
      ticks.push((i / sectionMarks) * 360);
    }
  }

  return (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      animate={glowVariants[state]}
      transition={{ duration: 0.5 }}
      aria-label={ariaLabel}
      style={{ width: size, height: size }}
      className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-solar-gold/50 disabled:cursor-not-allowed group"
    >
      <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="absolute inset-0 w-full h-full">
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
            <stop offset="0%" stopColor="rgba(255,215,0,0.22)" />
            <stop offset="100%" stopColor="rgba(255,215,0,0)" />
          </radialGradient>
        </defs>

        {/* Outer halo ring — JARVIS-style depth indicator. Counter-rotates
            slowly relative to the flares, lower opacity, thinner stroke. */}
        <motion.g
          style={{ transformOrigin: `${center}px ${center}px` }}
          animate={{ rotate: -360 }}
          transition={{ rotate: { duration: 60, repeat: Infinity, ease: 'linear' } }}
        >
          <circle
            cx={center}
            cy={center}
            r={HALO_RADIUS}
            fill="none"
            stroke="rgba(255,215,0,0.10)"
            strokeWidth="0.8"
            strokeDasharray="2 5"
          />
        </motion.g>

        {/* Inner glow disc — soft amber haze at the center. Brightens
            during a dive (signals "you've gone deeper"). */}
        <motion.circle
          cx={center}
          cy={center}
          r="55"
          fill="url(#flare-core-glow)"
          animate={{ opacity: inDive ? 1.4 : 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Outer ring — track */}
        <circle
          cx={center}
          cy={center}
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,215,0,0.10)"
          strokeWidth="2.5"
        />

        {/* Outer ring — progress fill */}
        <motion.circle
          cx={center}
          cy={center}
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
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* Tracking ticks at section boundaries — small radial line
            segments that show the briefing's structure on the ring. */}
        {ticks.map((angle) => (
          <line
            key={angle}
            x1={center + (RING_RADIUS - 4) * Math.cos(((angle - 90) * Math.PI) / 180)}
            y1={center + (RING_RADIUS - 4) * Math.sin(((angle - 90) * Math.PI) / 180)}
            x2={center + (RING_RADIUS + 4) * Math.cos(((angle - 90) * Math.PI) / 180)}
            y2={center + (RING_RADIUS + 4) * Math.sin(((angle - 90) * Math.PI) / 180)}
            stroke="rgba(255,215,0,0.55)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        ))}

        {/* Inner concentric ring — appears only during a dive. The "you've
            gone deeper" signal that replaces the slide-up sheet. Scales
            in/out smoothly to feel like the orb itself is deepening. */}
        <motion.g
          style={{ transformOrigin: `${center}px ${center}px` }}
          animate={inDive
            ? { scale: 1, opacity: 1, rotate: 360 }
            : { scale: 0, opacity: 0, rotate: 0 }
          }
          transition={{
            scale: { duration: 0.5, ease: 'easeOut' },
            opacity: { duration: 0.5 },
            rotate: { duration: 12, repeat: Infinity, ease: 'linear' },
          }}
        >
          <circle
            cx={center}
            cy={center}
            r={DIVE_RING_RADIUS}
            fill="none"
            stroke="url(#flare-ring-gold)"
            strokeWidth="1.6"
            strokeDasharray="6 4"
          />
        </motion.g>

        {/* Flares — three teardrop shapes around the core, state-animated */}
        <motion.g
          variants={flareVariants}
          animate={state}
          initial={false}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          {[0, 120, 240].map((angle) => (
            <g key={angle} transform={`rotate(${angle} ${center} ${center})`}>
              <ellipse
                cx={center}
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
          <Loader2 style={{ width: iconPx, height: iconPx }} className="text-solar-gold animate-spin" />
        ) : state === 'Listening' ? (
          <Pause style={{ width: iconPx, height: iconPx }} className="text-solar-100" fill="currentColor" />
        ) : (
          <Play style={{ width: iconPx, height: iconPx, marginLeft: iconPx * 0.08 }} className="text-solar-100" fill="currentColor" />
        )}
      </div>
    </motion.button>
  );
}
