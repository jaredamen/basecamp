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

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active
        ? 'bg-solar-700 text-solar-100'
        : 'text-solar-400 hover:text-solar-100 hover:bg-solar-800/60'
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-solar-gold/15">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={onNavigateHome}
            className="text-lg font-bold text-solar-100 hover:text-solar-gold transition-colors"
          >
            Basecamp
          </button>

          <nav className="hidden sm:flex items-center space-x-1">
            <button onClick={onNavigateHome} className={tabClass(currentView === 'input')}>
              New
            </button>
            {hasContent && (
              <button onClick={onNavigateContent} className={tabClass(currentView === 'content')}>
                Current
              </button>
            )}
            <button onClick={onNavigateLibrary} className={tabClass(currentView === 'library')}>
              Library
              {libraryCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center text-xs bg-solar-gold/15 text-solar-gold font-mono px-1.5 py-0.5 rounded-full">
                  {libraryCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {hasPaymentMethod ? (
            <span className="text-sm text-solar-400">
              Usage: <span className="text-solar-100 font-mono">${usageDollars}</span>
            </span>
          ) : freeRemainingCents > 0 ? (
            <span className="text-sm text-solar-400">
              Free: <span className="text-solar-gold font-mono">${freeDollars} left</span>
            </span>
          ) : (
            <button
              onClick={onAddPaymentMethod}
              className="text-sm font-medium text-solar-gold hover:text-solar-amber transition-colors"
            >
              Add payment method
            </button>
          )}

          {userName && (
            <span className="hidden sm:inline text-sm text-solar-400">
              {userName}
            </span>
          )}

          <button
            onClick={onSignOut}
            className="text-xs text-solar-500 hover:text-solar-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
