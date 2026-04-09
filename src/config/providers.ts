import type { ProviderInfo, AIProvider, InstructionStep } from '../types/byok';

export const AI_PROVIDERS: Record<AIProvider, ProviderInfo> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4 and ChatGPT models with excellent reasoning capabilities',
    website: 'https://platform.openai.com',
    apiKeyInstructions: [
      { text: 'Go to ', linkText: 'OpenAI API Keys', linkUrl: 'https://platform.openai.com/api-keys' },
      { text: 'Click "Create new secret key"' },
      { text: 'Copy the key (starts with sk-proj-)' },
    ],
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        costPerToken: 0.0000025,
        description: 'Latest GPT-4o model, fast and capable'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        costPerToken: 0.00000015,
        description: 'Smaller, faster, most cost-effective'
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        costPerToken: 0.00001,
        description: 'High capability for complex tasks'
      }
    ],
    defaultModel: 'gpt-4o',
    defaultSettings: {
      temperature: 0.7,
      maxTokens: 2000
    }
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models with strong reasoning and safety features',
    website: 'https://console.anthropic.com',
    apiKeyInstructions: [
      { text: 'Go to ', linkText: 'Anthropic API Keys', linkUrl: 'https://console.anthropic.com/account/keys' },
      { text: 'Click "Create Key"' },
      { text: 'Copy the key (starts with sk-ant-)' },
    ],
    models: [
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        costPerToken: 0.000003,
        description: 'Fast and capable for most tasks'
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        costPerToken: 0.000001,
        description: 'Fastest and most cost-effective'
      }
    ],
    defaultModel: 'claude-sonnet-4-6',
    defaultSettings: {
      temperature: 0.7,
      maxTokens: 2000
    }
  },

  google: {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini models with strong multimodal capabilities',
    website: 'https://ai.google.dev',
    apiKeyInstructions: [
      { text: 'Go to ', linkText: 'Google AI Studio', linkUrl: 'https://aistudio.google.com/apikey' },
      { text: 'Sign in with your Google account' },
      { text: 'Click "Create API key"' },
      { text: 'Select or create a Google Cloud project' },
      { text: 'Copy the generated API key' },
    ],
    models: [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        costPerToken: 0.00000125,
        description: 'Advanced reasoning and coding'
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        costPerToken: 0.00000015,
        description: 'Fast and budget-friendly with 1M context'
      }
    ],
    defaultModel: 'gemini-2.5-flash',
    defaultSettings: {
      temperature: 0.7,
      maxTokens: 2000
    }
  }
};

export interface ElevenLabsConfig {
  name: string;
  description: string;
  website: string;
  apiKeyInstructions: InstructionStep[];
  costPerCharacter: number;
  features: string[];
}

export const ELEVENLABS_CONFIG: ElevenLabsConfig = {
  name: 'ElevenLabs',
  description: '10,000+ premium voices including celebrities and characters',
  website: 'https://elevenlabs.io',
  apiKeyInstructions: [
    { text: 'Go to ', linkText: 'ElevenLabs API Keys', linkUrl: 'https://elevenlabs.io/app/developers/api-keys' },
    { text: 'Sign up or log in' },
    { text: 'Click "+ Create Key" to generate a new key' },
    { text: 'Copy your API key immediately (only shown once)' },
  ],
  costPerCharacter: 0.0001,
  features: [
    '10,000+ professional voices',
    'Celebrity and character voices',
    'Custom voice cloning',
    '70+ languages supported',
    'Streaming audio (75ms latency)',
    'Emotional expression'
  ]
};
