import type { FlashcardSet, AudioScript } from './aiPrompting';

const STORAGE_KEY = 'basecamp-briefing-library-v1';
/** Hard cap on how many briefings we keep. Each one is ~40-65 KB so 5 fits
 *  comfortably under the 5 MB localStorage origin limit alongside everything
 *  else. LRU eviction by `savedAt`. */
const MAX_BRIEFINGS = 5;

export interface SavedBriefing {
  id: string;
  savedAt: string; // ISO
  title: string;
  source: string; // URL or '' for pasted text
  flashcards: FlashcardSet;
  audioScript: AudioScript;
}

interface LibraryShape {
  version: 1;
  briefings: SavedBriefing[];
}

function readShape(): LibraryShape {
  if (typeof window === 'undefined') return { version: 1, briefings: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, briefings: [] };
    const parsed = JSON.parse(raw) as LibraryShape;
    if (parsed.version !== 1 || !Array.isArray(parsed.briefings)) {
      return { version: 1, briefings: [] };
    }
    return parsed;
  } catch {
    return { version: 1, briefings: [] };
  }
}

function writeShape(shape: LibraryShape): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
  } catch (err) {
    // Quota exceeded or storage disabled — drop the oldest briefing and retry once.
    if (shape.briefings.length > 1) {
      const trimmed: LibraryShape = {
        version: 1,
        briefings: shape.briefings.slice(1),
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        console.warn('briefingLibrary: localStorage write failed', err);
      }
    }
  }
}

function genId(): string {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const briefingLibrary = {
  list(): SavedBriefing[] {
    return readShape().briefings.slice().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  },

  get(id: string): SavedBriefing | null {
    return readShape().briefings.find(b => b.id === id) ?? null;
  },

  /**
   * Save a briefing. If a briefing with the same `source` already exists,
   * it's replaced (re-running on the same article shouldn't pollute the
   * library). Otherwise added; LRU-evict oldest beyond MAX_BRIEFINGS.
   */
  save(input: { title: string; source: string; flashcards: FlashcardSet; audioScript: AudioScript }): SavedBriefing {
    const shape = readShape();
    const now = new Date().toISOString();
    const existingIndex =
      input.source.length > 0
        ? shape.briefings.findIndex(b => b.source === input.source)
        : -1;

    const briefing: SavedBriefing = {
      id: existingIndex >= 0 ? shape.briefings[existingIndex].id : genId(),
      savedAt: now,
      title: input.title,
      source: input.source,
      flashcards: input.flashcards,
      audioScript: input.audioScript,
    };

    let next: SavedBriefing[];
    if (existingIndex >= 0) {
      next = shape.briefings.slice();
      next[existingIndex] = briefing;
    } else {
      next = [briefing, ...shape.briefings];
      // LRU evict: keep the most-recent MAX_BRIEFINGS. `next` is already
      // newest-first by virtue of the prepend.
      if (next.length > MAX_BRIEFINGS) next = next.slice(0, MAX_BRIEFINGS);
    }

    writeShape({ version: 1, briefings: next });
    return briefing;
  },

  delete(id: string): void {
    const shape = readShape();
    writeShape({
      version: 1,
      briefings: shape.briefings.filter(b => b.id !== id),
    });
  },

  clear(): void {
    writeShape({ version: 1, briefings: [] });
  },

  count(): number {
    return readShape().briefings.length;
  },
};
