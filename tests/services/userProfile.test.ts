import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadProfile,
  saveProfile,
  clearProfile,
  renderAudienceBlock,
} from '../../src/services/userProfile';

const STORAGE_KEY = 'basecamp-user-profile';

// jsdom in this project ships an inert localStorage stub (plain object,
// no Storage.prototype). Install a working Map-backed mock so the
// userProfile module's reads/writes actually round-trip.
function installLocalStorageMock() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal('localStorage', mock);
  return mock;
}

describe('userProfile', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  describe('saveProfile', () => {
    it('saves a profile with array-shaped expertise', () => {
      const saved = saveProfile({
        name: 'Alex',
        profession: '',
        expertise: ['Cooking', 'Music'],
        intent: '',
      });
      expect(saved.expertise).toEqual(['Cooking', 'Music']);
      expect(saved.completedAt).toBeTruthy();
    });

    it('caps expertise at 6 entries', () => {
      const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const saved = saveProfile({
        name: 'Alex',
        profession: '',
        expertise: tags,
        intent: '',
      });
      expect(saved.expertise).toHaveLength(6);
      expect(saved.expertise).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });

    it('dedupes expertise (case-insensitive) preserving order', () => {
      const saved = saveProfile({
        name: 'Alex',
        profession: '',
        expertise: ['Cooking', 'cooking', 'COOKING', 'Music'],
        intent: '',
      });
      expect(saved.expertise).toEqual(['Cooking', 'Music']);
    });

    it('strips < and > from each expertise entry', () => {
      const saved = saveProfile({
        name: 'Alex',
        profession: '',
        expertise: ['<script>evil</script>', 'Music'],
        intent: '',
      });
      expect(saved.expertise[0]).not.toContain('<');
      expect(saved.expertise[0]).not.toContain('>');
    });

    it('drops empty entries from expertise', () => {
      const saved = saveProfile({
        name: 'Alex',
        profession: '',
        expertise: ['Cooking', '', '   ', 'Music'],
        intent: '',
      });
      expect(saved.expertise).toEqual(['Cooking', 'Music']);
    });
  });

  describe('loadProfile — legacy migration', () => {
    it('migrates legacy single-string expertise into a one-element array', () => {
      // Simulate a profile saved by the old code path (string-shaped)
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          name: 'Jared',
          profession: '',
          expertise: 'distributed systems',
          intent: '',
          completedAt: new Date().toISOString(),
        })
      );
      const loaded = loadProfile();
      expect(loaded?.expertise).toEqual(['distributed systems']);
    });

    it('handles legacy empty-string expertise as empty array', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          name: 'Jared',
          profession: '',
          expertise: '',
          intent: '',
          completedAt: new Date().toISOString(),
        })
      );
      const loaded = loadProfile();
      expect(loaded?.expertise).toEqual([]);
    });

    it('returns null when no profile is stored', () => {
      expect(loadProfile()).toBeNull();
    });

    it('returns null for profile without completedAt', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ name: 'Jared', expertise: ['x'] })
      );
      expect(loadProfile()).toBeNull();
    });
  });

  describe('renderAudienceBlock', () => {
    it('returns empty string for null profile', () => {
      expect(renderAudienceBlock(null)).toBe('');
    });

    it('uses single-domain phrasing when expertise has one tag', () => {
      const block = renderAudienceBlock({
        name: 'Alex',
        profession: '',
        expertise: ['Cooking'],
        intent: '',
        completedAt: 'x',
      });
      expect(block).toContain('Familiar with: Cooking');
      expect(block).toContain('prefer bridging to Cooking');
    });

    it('uses multi-domain "vary across" phrasing when expertise has multiple tags', () => {
      const block = renderAudienceBlock({
        name: 'Alex',
        profession: '',
        expertise: ['Cooking', 'Music', 'Sports'],
        intent: '',
        completedAt: 'x',
      });
      expect(block).toContain('Familiar with: Cooking, Music, Sports');
      expect(block).toContain('vary across');
      expect(block).toContain('Cooking, Music, Sports');
      expect(block).toContain("Don't lean on just one");
    });

    it('omits expertise line when array is empty', () => {
      const block = renderAudienceBlock({
        name: 'Alex',
        profession: '',
        expertise: [],
        intent: '',
        completedAt: 'x',
      });
      expect(block).not.toContain('Familiar with');
    });
  });

  describe('clearProfile', () => {
    it('removes the stored profile', () => {
      saveProfile({
        name: 'Alex',
        profession: '',
        expertise: ['Cooking'],
        intent: '',
      });
      expect(loadProfile()).not.toBeNull();
      clearProfile();
      expect(loadProfile()).toBeNull();
    });
  });
});
