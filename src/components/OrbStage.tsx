import { SolarFlare, type FlareState } from './SolarFlare';
import { OrbCaption } from './OrbCaption';

interface OrbStageProps {
  state: FlareState;
  progress?: number;
  caption?: string;
  inDive?: boolean;
  sectionMarks?: number;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * The persistent JARVIS centerpiece — orb + caption stacked vertically.
 * Sized responsively: 220px on lg+ (desktop hero), 160px on smaller
 * screens (mobile companion). Mounted once at App-level and never
 * unmounted, so the user feels like the orb is the same protagonist
 * across every state of the app.
 */
export function OrbStage({
  state,
  progress = 0,
  caption,
  inDive = false,
  sectionMarks,
  onToggle,
  disabled = false,
}: OrbStageProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* lg breakpoint = desktop. On smaller, the orb shrinks so it doesn't
          dominate the (limited) vertical space. Tailwind's responsive
          utilities don't help directly because SolarFlare takes a numeric
          `size` prop — render two SolarFlares behind a `lg:hidden` guard.
          Both orbs share the same parent state, so the swap is invisible
          aside from one being mounted at a time. */}
      <div className="lg:hidden">
        <SolarFlare
          state={state}
          progress={progress}
          onToggle={onToggle}
          disabled={disabled}
          size={160}
          inDive={inDive}
          sectionMarks={sectionMarks}
        />
      </div>
      <div className="hidden lg:block">
        <SolarFlare
          state={state}
          progress={progress}
          onToggle={onToggle}
          disabled={disabled}
          size={220}
          inDive={inDive}
          sectionMarks={sectionMarks}
        />
      </div>
      <OrbCaption text={caption} />
    </div>
  );
}
