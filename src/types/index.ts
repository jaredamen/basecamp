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

export interface AudioBriefing {
  briefing_id: string;
  title: string;
  source: string;
  created_at: string;
  script: string;
  audio_file?: string;
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

export type VoicePersonality = 'standard' | 'peter-griffin' | 'motivational' | 'asmr';

export interface VoiceSettings {
  personality: VoicePersonality;
  rate: number;
  pitch: number;
  volume: number;
  systemVoice?: string;
}

export interface TTSState {
  isReading: boolean;
  currentText?: string;
  voiceSettings: VoiceSettings;
  availableVoices: SpeechSynthesisVoice[];
}

export interface EnhancedAudioPlayerState extends AudioPlayerState {
  ttsState: TTSState;
}

export type AppViewState = 
  | 'welcome'
  | 'demo' 
  | 'profile-setup'
  | 'dashboard'
  | 'main-app';