export type AIProvider = 'openai' | 'anthropic' | 'google';
export type VoiceProvider = 'elevenlabs';
export type SetupPath = 'simple' | 'managed';

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  costPerToken?: number;
}

export interface VoiceProviderConfig {
  id: VoiceProvider;
  name: string;
  apiKey: string;
  selectedVoiceId?: string;
  selectedVoiceName?: string;
}

export interface BYOKConfig {
  aiProvider: AIProviderConfig | null;
  voiceProvider: VoiceProviderConfig | null;
  setupPath: SetupPath;
  isConfigured: boolean;
}

export interface InstructionStep {
  text: string;
  linkText?: string;
  linkUrl?: string;
}

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  description: string;
  website: string;
  apiKeyInstructions: InstructionStep[];
  models: Array<{
    id: string;
    name: string;
    costPerToken: number;
    description: string;
  }>;
  defaultModel: string;
  defaultSettings: {
    temperature: number;
    maxTokens: number;
  };
}