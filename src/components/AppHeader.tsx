import { FEATURES } from '../config/features';

interface AppHeaderProps {
  userName?: string;
  usageCents: number;
  hasPaymentMethod: boolean;
  freeRemainingCents: number;
  hasContent: boolean;
  libraryCount: number;
  currentView: 'input' | 'generating' | 'content' | 'library';
  onNavigateHome: () => void;
  onNavigateContent: () => void;
  onNavigateLibrary: () => void;
  onAddPaymentMethod: () => void;
  onSignOut: () => void;
}

/**
 * Slim floating top strip — credit chip + nav chips + sign-out. Sits
 * above the orb without competing visually for attention. Glass
 * background, mono-spaced data, gold accents.
 *
 * Nav button names ("New", "Current", "Library") preserved verbatim
 * because the Golden-Path E2E asserts on them.
 */
export function AppHeader({
  userName,
  usageCents,
  hasPaymentMethod,
  freeRemainingCents,
  hasContent,
  libraryCount,
  currentView,
  onNavigateHome,
  onNavigateContent,
  onNavigateLibrary,
  onAddPaymentMethod,
  onSignOut,
}: AppHeaderProps) {
  const usageDollars = (usageCents / 100).toFixed(2);
  const freeDollars = (freeRemainingCents / 100).toFixed(2);

  const navChip = (active: boolean) =>
    `px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-mono whitespace-nowrap transition-colors ${
      active
        ? 'bg-solar-gold/20 text-solar-gold border border-solar-gold/40'
        : 'text-solar-500 hover:text-solar-100 border border-transparent'
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-solar-gold/10">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onNavigateHome}
            className="text-sm font-semibold text-solar-100 hover:text-solar-gold transition-colors tracking-wide whitespace-nowrap"
          >
            basecamp
          </button>

          <nav className="flex items-center gap-1">
            <button onClick={onNavigateHome} className={navChip(currentView === 'input')}>
              New
            </button>
            {hasContent && (
              <button onClick={onNavigateContent} className={navChip(currentView === 'content')}>
                Current
              </button>
            )}
            {FEATURES.showLibrary && (
              <button onClick={onNavigateLibrary} className={navChip(currentView === 'library')}>
                Library
                {libraryCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center text-[10px] bg-solar-gold/20 text-solar-gold font-mono px-1 rounded">
                    {libraryCount}
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {hasPaymentMethod ? (
            <span className="text-[11px] sm:text-xs text-solar-500 font-mono whitespace-nowrap">
              <span className="hidden sm:inline">usage: </span>
              <span className="text-solar-100">${usageDollars}</span>
            </span>
          ) : freeRemainingCents > 0 ? (
            <span className="text-[11px] sm:text-xs text-solar-500 font-mono whitespace-nowrap">
              <span className="hidden sm:inline">free: </span>
              <span className="text-solar-gold">${freeDollars} left</span>
            </span>
          ) : (
            <button
              onClick={onAddPaymentMethod}
              className="text-[11px] sm:text-xs font-mono text-solar-gold hover:text-solar-amber transition-colors whitespace-nowrap"
            >
              add payment method
            </button>
          )}

          {userName && (
            <span className="hidden md:inline text-xs text-solar-500 font-mono truncate max-w-[12ch]">
              {userName}
            </span>
          )}

          <button
            onClick={onSignOut}
            className="text-[10px] text-solar-500 hover:text-solar-100 transition-colors font-mono uppercase tracking-wider whitespace-nowrap"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
