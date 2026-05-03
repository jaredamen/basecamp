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
      {/* Three-tier responsive sizing — SolarFlare takes a numeric `size`
          prop so we render three instances behind responsive guards.
          Only one is mounted at a time so the visual swap is invisible
          aside from the size change at each breakpoint:
            <sm  (mobile, <640px)        : 140px
            sm-to-lg (tablet, 640–1023)  : 180px
            lg+  (desktop, ≥1024px)      : 220px */}
      <div className="sm:hidden">
        <SolarFlare
          state={state}
          progress={progress}
          onToggle={onToggle}
          disabled={disabled}
          size={140}
          inDive={inDive}
          sectionMarks={sectionMarks}
        />
      </div>
      <div className="hidden sm:block lg:hidden">
        <SolarFlare
          state={state}
          progress={progress}
          onToggle={onToggle}
          disabled={disabled}
          size={180}
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
