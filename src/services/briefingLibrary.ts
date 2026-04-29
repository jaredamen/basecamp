import type { FlashcardSet, AudioScript } from './aiPrompting';

const STORAGE_KEY = 'basecamp-briefing-library-v1';
/** Hard cap on how many briefings we keep. Each one is ~40-65 KB so 5 fits
 *  comfortably under the 5 MB localStorage origin limit alongside everything
 *  else. LRU eviction by `savedAt`. */
const MAX_BRIEFINGS = 5;

/** Per-card review counts. Drives the smart second-listen choice of which
 *  cards to interrupt with — cards struggled-with bubble to the top. */
export interface CardReviewStats {
  gotIt: number;
  reviewAgain: number;
  lastReviewedAt: string;
}

export interface SavedBriefing {
  id: string;
  savedAt: string; // ISO
  title: string;
  source: string; // URL or '' for pasted text
  flashcards: FlashcardSet;
  audioScript: AudioScript;
  /** Accumulated review history for the cards in this deck, indexed by card id.
   *  Updated whenever the user marks a card Got It / Review Again — whether
   *  from the Study Cards tab or from a mid-listen audio interruption. */
  cardReviews?: Record<string, CardReviewStats>;
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

export const briefingLibrary = {
  list(): SavedBriefing[] {
    return readShape().briefings.slice().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  },

  get(id: string): SavedBriefing | null {
    return readShape().briefings.find(b => b.id === id) ?? null;
  },

  /**
   * Save a briefing. The library's id IS the FlashcardSet's id — same deck
   * means same library entry, which lets the AudioPlayer's per-card review
   * history (keyed on briefing_id) line up with what the library stores.
   *
   * Dedupe rules:
   *   1. If a briefing with the same `flashcards.id` already exists, merge —
   *      preserving any accumulated `cardReviews` (re-saving the same deck
   *      shouldn't wipe history).
   *   2. Else if a briefing with the same non-empty `source` URL exists,
   *      replace it (regenerating on the same article supersedes the old).
   *   3. Else add new and LRU-evict oldest beyond MAX_BRIEFINGS.
   */
  save(input: { title: string; source: string; flashcards: FlashcardSet; audioScript: AudioScript }): SavedBriefing {
    const shape = readShape();
    const now = new Date().toISOString();
    const id = input.flashcards.id;

    const sameIdIndex = shape.briefings.findIndex(b => b.id === id);
    const sameSourceIndex =
      input.source.length > 0
        ? shape.briefings.findIndex(b => b.source === input.source && b.id !== id)
        : -1;

    const preservedReviews = sameIdIndex >= 0 ? shape.briefings[sameIdIndex].cardReviews : undefined;

    const briefing: SavedBriefing = {
      id,
      savedAt: now,
      title: input.title,
      source: input.source,
      flashcards: input.flashcards,
      audioScript: input.audioScript,
      cardReviews: preservedReviews,
    };

    let next = shape.briefings.slice();
    if (sameIdIndex >= 0) {
      next[sameIdIndex] = briefing;
    } else if (sameSourceIndex >= 0) {
      next[sameSourceIndex] = briefing;
    } else {
      next = [briefing, ...next];
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

  /**
   * Record one Got It / Review Again on a card within a briefing. Increments
   * the matching counter and stamps `lastReviewedAt`. No-op if the briefing
   * isn't in the library yet (auto-save hasn't fired) — first-listen reviews
   * before save are simply not tracked, which is acceptable for v1.
   */
  recordCardReview(briefingId: string, cardId: string, verdict: 'gotIt' | 'reviewAgain'): void {
    const shape = readShape();
    const idx = shape.briefings.findIndex(b => b.id === briefingId);
    if (idx === -1) return;

    const briefing = shape.briefings[idx];
    const reviews = { ...(briefing.cardReviews ?? {}) };
    const prev: CardReviewStats = reviews[cardId] ?? {
      gotIt: 0,
      reviewAgain: 0,
      lastReviewedAt: '',
    };
    reviews[cardId] = {
      gotIt: prev.gotIt + (verdict === 'gotIt' ? 1 : 0),
      reviewAgain: prev.reviewAgain + (verdict === 'reviewAgain' ? 1 : 0),
      lastReviewedAt: new Date().toISOString(),
    };

    const next = shape.briefings.slice();
    next[idx] = { ...briefing, cardReviews: reviews };
    writeShape({ version: 1, briefings: next });
  },

  getReviewHistory(briefingId: string): Record<string, CardReviewStats> {
    const briefing = this.get(briefingId);
    return briefing?.cardReviews ?? {};
  },
};
