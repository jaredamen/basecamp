import { useState } from 'react';
import { briefingLibrary, type SavedBriefing } from '../services/briefingLibrary';

interface LibraryViewProps {
  onOpen: (briefing: SavedBriefing) => void;
  onBack: () => void;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

function sourceLabel(source: string): string {
  if (!source) return 'Pasted text';
  try {
    const u = new URL(source);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'Pasted text';
  }
}

export function LibraryView({ onOpen, onBack }: LibraryViewProps) {
  const [briefings, setBriefings] = useState<SavedBriefing[]>(() => briefingLibrary.list());

  const handleDelete = (id: string) => {
    briefingLibrary.delete(id);
    setBriefings(briefingLibrary.list());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white">Library</h1>
          <span className="text-sm text-dark-400">{briefings.length} saved</span>
        </div>

        {briefings.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-dark-300 text-lg">No saved briefings yet.</p>
            <p className="text-dark-400 text-sm">
              Generate one and it'll show up here automatically.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {briefings.map((b) => (
              <li
                key={b.id}
                className="bg-dark-800/60 border border-dark-700 rounded-xl p-4 hover:border-blue-500/40 hover:bg-dark-800 transition-colors"
              >
                <button
                  onClick={() => onOpen(b)}
                  className="w-full text-left"
                  aria-label={`Open ${b.title}`}
                >
                  <h2 className="text-lg font-semibold text-white truncate">{b.title}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-dark-400">
                    <span>{sourceLabel(b.source)}</span>
                    <span>•</span>
                    <span>{b.flashcards.cards.length} card{b.flashcards.cards.length === 1 ? '' : 's'}</span>
                    <span>•</span>
                    <span>{relativeTime(b.savedAt)}</span>
                  </div>
                </button>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-xs text-dark-500 hover:text-red-400 transition-colors"
                    aria-label={`Delete ${b.title}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
