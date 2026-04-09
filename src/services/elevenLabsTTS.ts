import type { VoiceProviderConfig } from '../types/byok';
import type { AudioScript } from './aiPrompting';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  labels: {
    accent?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  settings: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface VoiceCategory {
  name: string;
  description: string;
  voices: ElevenLabsVoice[];
}

export interface TTSGenerationOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface AudioGeneration {
  id: string;
  audioUrl: string;
  text: string;
  voiceId: string;
  voiceName: string;
  duration?: number;
  createdAt: string;
}

export class ElevenLabsTTSService {
  private static instance: ElevenLabsTTSService;
  private voicesCache: ElevenLabsVoice[] | null = null;
  private categorizedVoices: VoiceCategory[] | null = null;

  static getInstance(): ElevenLabsTTSService {
    if (!ElevenLabsTTSService.instance) {
      ElevenLabsTTSService.instance = new ElevenLabsTTSService();
    }
    return ElevenLabsTTSService.instance;
  }

  async getVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
    if (this.voicesCache) {
      return this.voicesCache;
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.voicesCache = data.voices || [];
      return this.voicesCache!;
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      throw new Error('Failed to fetch voice library. Please check your API key.');
    }
  }

  async getCategorizedVoices(apiKey: string): Promise<VoiceCategory[]> {
    if (this.categorizedVoices) {
      return this.categorizedVoices;
    }

    const voices = await this.getVoices(apiKey);
    
    // Categorize voices based on use case and characteristics
    const categories: Record<string, ElevenLabsVoice[]> = {
      'Professional': [],
      'Conversational': [],
      'Character': [],
      'Celebrity': [],
      'Narrative': [],
      'Educational': [],
      'Other': []
    };

    voices.forEach(voice => {
      const useCase = voice.labels.use_case?.toLowerCase() || '';
      const name = voice.name.toLowerCase();
      
      if (name.includes('morgan freeman') || name.includes('celebrity') || voice.category === 'celebrity') {
        categories['Celebrity'].push(voice);
      } else if (useCase.includes('professional') || useCase.includes('business')) {
        categories['Professional'].push(voice);
      } else if (useCase.includes('conversational') || useCase.includes('chat')) {
        categories['Conversational'].push(voice);
      } else if (useCase.includes('character') || useCase.includes('gaming')) {
        categories['Character'].push(voice);
      } else if (useCase.includes('narrative') || useCase.includes('storytelling')) {
        categories['Narrative'].push(voice);
      } else if (useCase.includes('educational') || useCase.includes('learning')) {
        categories['Educational'].push(voice);
      } else {
        categories['Other'].push(voice);
      }
    });

    this.categorizedVoices = [
      {
        name: 'Educational',
        description: 'Perfect for learning content and tutorials',
        voices: categories['Educational']
      },
      {
        name: 'Professional',
        description: 'Business and professional presentations',
        voices: categories['Professional']
      },
      {
        name: 'Narrative',
        description: 'Storytelling and engaging narration',
        voices: categories['Narrative']
      },
      {
        name: 'Conversational',
        description: 'Natural, friendly conversation style',
        voices: categories['Conversational']
      },
      {
        name: 'Celebrity',
        description: 'Famous voices and celebrity impersonations',
        voices: categories['Celebrity']
      },
      {
        name: 'Character',
        description: 'Unique characters and gaming voices',
        voices: categories['Character']
      },
      {
        name: 'Other',
        description: 'Additional high-quality voices',
        voices: categories['Other']
      }
    ].filter(category => category.voices.length > 0);

    return this.categorizedVoices;
  }

  async generateAudio(
    text: string,
    voiceConfig: VoiceProviderConfig,
    options: TTSGenerationOptions = {}
  ): Promise<AudioGeneration> {
    const voiceId = options.voiceId || voiceConfig.selectedVoiceId || 'pNInz6obpgDQGcFmaJgB'; // Default voice
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': voiceConfig.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: options.stability ?? 0.75,
            similarity_boost: options.similarityBoost ?? 0.75,
            style: options.style ?? 0.5,
            use_speaker_boost: options.useSpeakerBoost ?? true
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs TTS Error: ${errorData.detail?.message || response.statusText}`);
      }

      // Convert response to blob and create URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Get voice name
      const voices = await this.getVoices(voiceConfig.apiKey);
      const voice = voices.find(v => v.voice_id === voiceId);
      const voiceName = voice?.name || voiceConfig.selectedVoiceName || 'Unknown Voice';

      return {
        id: this.generateId(),
        audioUrl,
        text,
        voiceId,
        voiceName,
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Audio generation failed:', error);
      throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateFromScript(
    script: AudioScript,
    voiceConfig: VoiceProviderConfig,
    options: TTSGenerationOptions = {}
  ): Promise<AudioGeneration[]> {
    const generations: AudioGeneration[] = [];

    try {
      // Generate audio for each section
      for (const section of script.sections) {
        const sectionText = `${section.heading}\n\n${section.content}`;
        const generation = await this.generateAudio(sectionText, voiceConfig, options);
        generations.push(generation);
      }

      return generations;
    } catch (error) {
      console.error('Script audio generation failed:', error);
      throw new Error('Failed to generate audio from script');
    }
  }

  async generateFullNarrative(
    script: AudioScript,
    voiceConfig: VoiceProviderConfig,
    options: TTSGenerationOptions = {}
  ): Promise<AudioGeneration> {
    try {
      // Combine all sections into a single narrative
      const fullText = script.sections
        .map(section => {
          let text = section.content;
          
          // Add natural pauses based on section emphasis
          if (section.emphasis === 'strong') {
            text = `${text}...`; // Add pause for emphasis
          }
          
          if (section.pauseAfter) {
            text += '.'.repeat(Math.min(section.pauseAfter, 3)); // Add pauses
          }
          
          return text;
        })
        .join('\n\n');

      return await this.generateAudio(fullText, voiceConfig, options);
    } catch (error) {
      console.error('Full narrative generation failed:', error);
      throw new Error('Failed to generate full narrative audio');
    }
  }

  async previewVoice(voiceId: string, apiKey: string): Promise<string> {
    try {
      const sampleText = "Hello! This is a preview of how I sound when teaching technical concepts. I'll help make your learning journey engaging and clear.";
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: sampleText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Preview failed: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Voice preview failed:', error);
      throw new Error('Failed to generate voice preview');
    }
  }

  clearVoicesCache(): void {
    this.voicesCache = null;
    this.categorizedVoices = null;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}