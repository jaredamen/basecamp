export interface FlashcardDeck {
  deck_id: string;
  title: string;
  source: string;
  created_at: string;
  cards: Flashcard[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface AudioBriefingSection {
  id: string;
  content: string;
}

/**
 * A point in the audio narrative where playback pauses and the player
 * surfaces a flashcard from the deck for active recall. The card is
 * referenced by id from the AudioBriefing's parent FlashcardSet — there
 * is no separate "audio quiz" type. One concept = one flashcard, three
 * surfaces (cards / mid-listen interrupt / second-listen review).
 */
export interface AudioInterruptionPoint {
  afterSectionIndex: number;
  cardId: string;
}

export interface AudioBriefing {
  briefing_id: string;
  title: string;
  source: string;
  created_at: string;
  /** Full joined script — used for fallback playback and the "Show Script" view */
  script: string;
  audio_file?: string;
  /** When present, the player plays sections sequentially and pauses between
   *  each one to surface a flashcard via `interruptionPoints`. Absent on
   *  legacy briefings without active-recall checkpoints. */
  sections?: AudioBriefingSection[];
  interruptionPoints?: AudioInterruptionPoint[];
}

export interface FlashcardSession {
  deckId: string;
  currentCardIndex: number;
  gotItCount: number;
  reviewAgainCount: number;
  completedCards: Set<string>;
  reviewAgainCards: Set<string>;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  currentBriefing?: AudioBriefing;
}

export type TabType = 'audio' | 'flashcards';

export interface DataLoader {
  loadFlashcardDecks(): Promise<FlashcardDeck[]>;
  loadAudioBriefings(): Promise<AudioBriefing[]>;
  importFromFile(file: File): Promise<FlashcardDeck[] | AudioBriefing[]>;
}

