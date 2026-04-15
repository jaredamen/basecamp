interface AppHeaderProps {
  userName?: string;
  balanceCents: number;
  hasContent: boolean;
  currentView: 'input' | 'generating' | 'content';
  onNavigateHome: () => void;
  onNavigateContent: () => void;
  onAddCredits: () => void;
  onSignOut: () => void;
}

export function AppHeader({
  userName,
  balanceCents,
  hasContent,
  currentView,
  onNavigateHome,
  onNavigateContent,
  onAddCredits,
  onSignOut,
}: AppHeaderProps) {
  const dollars = (balanceCents / 100).toFixed(2);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-sm border-b border-dark-700">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo + nav */}
        <div className="flex items-center space-x-6">
          <button
            onClick={onNavigateHome}
            className="text-lg font-bold text-white hover:text-blue-400 transition-colors"
          >
            Basecamp
          </button>

          <nav className="hidden sm:flex items-center space-x-1">
            <button
              onClick={onNavigateHome}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentView === 'input'
                  ? 'bg-dark-700 text-white'
                  : 'text-dark-300 hover:text-white hover:bg-dark-800'
              }`}
            >
              New
            </button>
            {hasContent && (
              <button
                onClick={onNavigateContent}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'content'
                    ? 'bg-dark-700 text-white'
                    : 'text-dark-300 hover:text-white hover:bg-dark-800'
                }`}
              >
                My Content
              </button>
            )}
          </nav>
        </div>

        {/* Right: Balance + account */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onAddCredits}
            className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
            title="Click to add credits"
          >
            ${dollars}
          </button>

          {userName && (
            <span className="hidden sm:inline text-sm text-dark-400">
              {userName}
            </span>
          )}

          <button
            onClick={onSignOut}
            className="text-xs text-dark-500 hover:text-dark-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
