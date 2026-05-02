interface DiveLoaderProps {
  /** The term the user clicked to dive into. Empty string falls back to a
   *  generic "Diving deeper…" label (defensive — selection should always
   *  be present when a dive is in flight). */
  selection: string;
}

export function DiveLoader({ selection }: DiveLoaderProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-4">
      <div className="text-5xl">🤿</div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-solar-100">
          {selection ? <>Diving into <span className="text-solar-gold">"{selection}"</span>…</> : 'Diving deeper…'}
        </h2>
        <p className="text-sm text-solar-400">Generating a focused mini-briefing — about 10 seconds.</p>
      </div>
      <div className="mt-2 w-10 h-10 border-4 border-solar-gold/30 border-t-solar-gold rounded-full animate-spin" />
    </div>
  );
}
