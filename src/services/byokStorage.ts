import type { BYOKConfig, AIProviderConfig, VoiceProviderConfig, SetupPath } from '../types/byok';

const BYOK_STORAGE_KEY = 'basecamp-byok-config';
const BYOK_VERSION = '1.0.0';

interface StoredBYOKConfig extends BYOKConfig {
  version: string;
  createdAt: string;
  lastUpdated: string;
}

export class BYOKStorage {
  private static instance: BYOKStorage;
  
  static getInstance(): BYOKStorage {
    if (!BYOKStorage.instance) {
      BYOKStorage.instance = new BYOKStorage();
    }
    return BYOKStorage.instance;
  }

  createDefaultConfig(): BYOKConfig {
    return {
      aiProvider: null,
      voiceProvider: null,
      setupPath: 'simple',
      isConfigured: false
    };
  }

  loadConfig(): BYOKConfig {
    try {
      const stored = localStorage.getItem(BYOK_STORAGE_KEY);
      if (!stored) {
        return this.createDefaultConfig();
      }

      const parsed: StoredBYOKConfig = JSON.parse(stored);
      
      // Handle version migrations if needed
      if (parsed.version !== BYOK_VERSION) {
        return this.migrateConfig(parsed);
      }

      // Remove storage-specific fields for runtime config
      const { version, createdAt, lastUpdated, ...config } = parsed;
      return config;
    } catch (error) {
      console.error('Failed to load BYOK config:', error);
      return this.createDefaultConfig();
    }
  }

  saveConfig(config: BYOKConfig): void {
    try {
      const now = new Date().toISOString();
      const storedConfig: StoredBYOKConfig = {
        ...config,
        version: BYOK_VERSION,
        createdAt: this.loadConfig().isConfigured ? this.getStoredConfig()?.createdAt || now : now,
        lastUpdated: now
      };

      localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(storedConfig));
    } catch (error) {
      console.error('Failed to save BYOK config:', error);
    }
  }

  updateSetupPath(setupPath: SetupPath): BYOKConfig {
    const config = this.loadConfig();
    config.setupPath = setupPath;
    this.saveConfig(config);
    return config;
  }

  updateAIProvider(providerConfig: AIProviderConfig): BYOKConfig {
    const config = this.loadConfig();
    config.aiProvider = providerConfig;
    config.isConfigured = this.checkIfConfigured({ ...config, aiProvider: providerConfig });
    this.saveConfig(config);
    return config;
  }

  updateVoiceProvider(providerConfig: VoiceProviderConfig): BYOKConfig {
    const config = this.loadConfig();
    config.voiceProvider = providerConfig;
    config.isConfigured = this.checkIfConfigured({ ...config, voiceProvider: providerConfig });
    this.saveConfig(config);
    return config;
  }

  clearConfig(): BYOKConfig {
    localStorage.removeItem(BYOK_STORAGE_KEY);
    return this.createDefaultConfig();
  }

  // Validate API key format (basic validation)
  validateAPIKey(provider: string, apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    switch (provider) {
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'anthropic':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
      case 'google':
        return apiKey.length > 20; // Google keys have various formats
      case 'elevenlabs':
        return apiKey.length > 20; // ElevenLabs keys are typically long strings
      default:
        return apiKey.length > 10; // Basic length check
    }
  }

  // Test API key by making a simple request
  async testAPIKey(provider: AIProviderConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const testPrompt = "Say 'Hello' in one word.";
      
      let response: Response;
      
      switch (provider.id) {
        case 'openai':
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${provider.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: provider.model,
              messages: [{ role: 'user', content: testPrompt }],
              max_tokens: 5,
              temperature: 0.1
            })
          });
          break;

        case 'anthropic':
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': provider.apiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: provider.model,
              max_tokens: 5,
              messages: [{ role: 'user', content: testPrompt }]
            })
          });
          break;

        default:
          throw new Error('Provider testing not implemented yet');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: `API Error (${response.status}): ${errorData.error?.message || 'Invalid API key'}` 
        };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get cost estimate for content generation
  getCostEstimate(provider: AIProviderConfig, inputTokens: number = 2000, outputTokens: number = 1000): number {
    const costPerToken = provider.costPerToken || 0.00003; // Default rough estimate
    return (inputTokens + outputTokens) * costPerToken;
  }

  // Export config for backup/sharing
  exportConfig(): string {
    const config = this.loadConfig();
    // Remove sensitive data for sharing
    const exportConfig = {
      ...config,
      aiProvider: config.aiProvider ? { 
        ...config.aiProvider, 
        apiKey: '[API_KEY_HIDDEN]' 
      } : null,
      voiceProvider: config.voiceProvider ? { 
        ...config.voiceProvider, 
        apiKey: '[API_KEY_HIDDEN]' 
      } : null
    };
    return JSON.stringify(exportConfig, null, 2);
  }

  private checkIfConfigured(config: BYOKConfig): boolean {
    if (config.setupPath === 'managed') {
      return true; // Managed users don't need local API keys
    }
    return !!(config.aiProvider?.apiKey && config.voiceProvider?.apiKey);
  }

  private getStoredConfig(): StoredBYOKConfig | null {
    try {
      const stored = localStorage.getItem(BYOK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private migrateConfig(oldConfig: StoredBYOKConfig): BYOKConfig {
    console.log(`Migrating BYOK config from ${oldConfig.version} to ${BYOK_VERSION}`);
    
    // For now, create new config but preserve setup path if it exists
    const newConfig = this.createDefaultConfig();
    if (oldConfig.setupPath) {
      newConfig.setupPath = oldConfig.setupPath;
    }
    
    this.saveConfig(newConfig);
    return newConfig;
  }
}