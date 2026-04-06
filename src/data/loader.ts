import type { FlashcardDeck, AudioBriefing, DataLoader } from '../types';

class LocalDataLoader implements DataLoader {
  async loadFlashcardDecks(): Promise<FlashcardDeck[]> {
    try {
      const deckFiles = [
        '/sample-data/flashcards/kubernetes-network-policies.json',
        '/sample-data/flashcards/prometheus-alerting.json'
      ];
      
      const decks = await Promise.all(
        deckFiles.map(async (file) => {
          const response = await fetch(file);
          if (!response.ok) {
            throw new Error(`Failed to load ${file}`);
          }
          return response.json();
        })
      );
      
      return decks;
    } catch (error) {
      console.error('Error loading flashcard decks:', error);
      return [];
    }
  }

  async loadAudioBriefings(): Promise<AudioBriefing[]> {
    try {
      const briefingFiles = [
        '/sample-data/briefings/prometheus-2-50-release.json',
        '/sample-data/briefings/kubernetes-1-29-features.json'
      ];
      
      const briefings = await Promise.all(
        briefingFiles.map(async (file) => {
          const response = await fetch(file);
          if (!response.ok) {
            throw new Error(`Failed to load ${file}`);
          }
          return response.json();
        })
      );
      
      return briefings;
    } catch (error) {
      console.error('Error loading audio briefings:', error);
      return [];
    }
  }

  async importFromFile(file: File): Promise<FlashcardDeck[] | AudioBriefing[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Detect if it's a flashcard deck or audio briefing
          if (Array.isArray(data)) {
            resolve(data);
          } else if (data.cards) {
            resolve([data as FlashcardDeck]);
          } else if (data.script) {
            resolve([data as AudioBriefing]);
          } else {
            reject(new Error('Invalid file format'));
          }
        } catch {
          reject(new Error('Failed to parse JSON file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

// TODO: Future API-based loader
// @ts-expect-error - This class is for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class ApiDataLoader implements DataLoader {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async loadFlashcardDecks(): Promise<FlashcardDeck[]> {
    try {
      const response = await fetch(`${this.baseUrl}/flashcard-decks`);
      if (!response.ok) {
        throw new Error('Failed to load flashcard decks from API');
      }
      return response.json();
    } catch (error) {
      console.error('Error loading flashcard decks from API:', error);
      return [];
    }
  }

  async loadAudioBriefings(): Promise<AudioBriefing[]> {
    try {
      const response = await fetch(`${this.baseUrl}/audio-briefings`);
      if (!response.ok) {
        throw new Error('Failed to load audio briefings from API');
      }
      return response.json();
    } catch (error) {
      console.error('Error loading audio briefings from API:', error);
      return [];
    }
  }

  async importFromFile(file: File): Promise<FlashcardDeck[] | AudioBriefing[]> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.baseUrl}/import`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to import file via API');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error importing file via API:', error);
      throw error;
    }
  }
}

// Export the appropriate loader based on environment
const createDataLoader = (): DataLoader => {
  // For MVP, always use local loader
  // In the future, this could be configurable or environment-based
  return new LocalDataLoader();
  
  // Future implementation:
  // return process.env.VITE_API_URL ? new ApiDataLoader(process.env.VITE_API_URL) : new LocalDataLoader();
};

export default createDataLoader;