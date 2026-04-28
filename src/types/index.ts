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

export interface AudioQuiz {
  id: string;
  afterSectionIndex: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
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
   *  each one to render a quiz from `quizzes` whose afterSectionIndex matches.
   *  Absent on legacy briefings or when the LLM didn't emit checkpoint quizzes. */
  sections?: AudioBriefingSection[];
  quizzes?: AudioQuiz[];
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