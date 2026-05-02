import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

/**
 * Top-level layout host for the JARVIS orb experience. Renders the deep
 * Eigengrau backdrop with a single radial gold glow positioned beneath the
 * orb's resting place — replaces the per-screen `bg-gradient-to-br ...`
 * gradients each component used to manage on its own.
 *
 * The orb + state-driven content band live as children of this shell.
 * Two-column on lg+ (orb left, band right); single-column on smaller
 * screens (orb top, band below).
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-solar-900 overflow-hidden">
      {/* Single radial gold glow under the orb's position. Positioned to
          align with where OrbStage centers the orb on each breakpoint. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 inset-0"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 30% 50%, rgba(255,215,0,0.10), transparent 70%)',
        }}
      />
      {/* Subtle scan-line overlay — JARVIS holographic feel. Very low
          opacity so it reads as atmosphere, not chrome. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(transparent 0px, transparent 3px, rgba(255,215,0,0.018) 3px, rgba(255,215,0,0.018) 4px)',
        }}
      />
      {children}
    </div>
  );
}
