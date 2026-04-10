import type { BYOKConfig, AIProviderConfig, VoiceProviderConfig, SetupPath } from '../types/byok';

// COMPLIANCE: BYOK_STANDARD.md requires that user-supplied API keys are NEVER
// persisted to any storage (database, localStorage, sessionStorage, logs, etc).
// We store only NON-SENSITIVE config (provider id, model, setup path) in
// localStorage so users don't have to re-pick everything each session.
// The actual `apiKey` field lives in module-level memory only and is cleared
// on logout / page reload.

const BYOK_STORAGE_KEY = 'basecamp-byok-config';
const BYOK_VERSION = '2.0.0'; // bumped to invalidate any pre-compliance configs

interface PersistedBYOKConfig {
  version: string;
  setupPath: SetupPath;
  // API keys are STRIPPED before persisting — these are the safe fields only
  aiProvider: Omit<AIProviderConfig, 'apiKey'> | null;
  voiceProvider: Omit<VoiceProviderConfig, 'apiKey'> | null;
}

// In-memory key store — never serialized, never persisted.
// Cleared on page reload (which is what compliance requires).
const inMemoryKeys: {
  ai: string | null;
  voice: string | null;
} = {
  ai: null,
  voice: null,
};

export class BYOKStorage {
  private static instance: BYOKStorage;

  static getInstance(): BYOKStorage {
    if (!BYOKStorage.instance) {
      BYOKStorage.instance = new BYOKStorage();
      // Migrate/clear any pre-2.0.0 configs that might contain plaintext keys
      BYOKStorage.instance.purgeUnsafeLegacyConfigs();
    }
    return BYOKStorage.instance;
  }

  createDefaultConfig(): BYOKConfig {
    return {
      aiProvider: null,
      voiceProvider: null,
      setupPath: 'simple',
      isConfigured: false,
    };
  }

  loadConfig(): BYOKConfig {
    try {
      const stored = localStorage.getItem(BYOK_STORAGE_KEY);
      if (!stored) {
        return this.createDefaultConfig();
      }

      const parsed: PersistedBYOKConfig = JSON.parse(stored);

      if (parsed.version !== BYOK_VERSION) {
        // Wrong version → clear it (might contain plaintext keys from old format)
        localStorage.removeItem(BYOK_STORAGE_KEY);
        return this.createDefaultConfig();
      }

      // Rehydrate runtime config: persisted non-sensitive fields + in-memory keys
      const aiProvider: AIProviderConfig | null = parsed.aiProvider
        ? { ...parsed.aiProvider, apiKey: inMemoryKeys.ai ?? '' }
        : null;
      const voiceProvider: VoiceProviderConfig | null = parsed.voiceProvider
        ? { ...parsed.voiceProvider, apiKey: inMemoryKeys.voice ?? '' }
        : null;

      return {
        aiProvider,
        voiceProvider,
        setupPath: parsed.setupPath,
        isConfigured: this.checkIfConfigured({
          aiProvider,
          voiceProvider,
          setupPath: parsed.setupPath,
          isConfigured: false,
        }),
      };
    } catch (error) {
      console.error('Failed to load BYOK config:', error);
      return this.createDefaultConfig();
    }
  }

  saveConfig(config: BYOKConfig): void {
    try {
      // Update in-memory keys (these never touch storage)
      if (config.aiProvider) {
        inMemoryKeys.ai = config.aiProvider.apiKey || null;
      }
      if (config.voiceProvider) {
        inMemoryKeys.voice = config.voiceProvider.apiKey || null;
      }

      // Persist ONLY non-sensitive fields
      const persisted: PersistedBYOKConfig = {
        version: BYOK_VERSION,
        setupPath: config.setupPath,
        aiProvider: config.aiProvider
          ? this.stripKey(config.aiProvider)
          : null,
        voiceProvider: config.voiceProvider
          ? this.stripKey(config.voiceProvider)
          : null,
      };

      localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(persisted));
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

  // Clears both persisted config and in-memory keys.
  // Call this on logout or "sign out" actions.
  clearConfig(): BYOKConfig {
    localStorage.removeItem(BYOK_STORAGE_KEY);
    inMemoryKeys.ai = null;
    inMemoryKeys.voice = null;
    return this.createDefaultConfig();
  }

  // Returns true if the user has the in-memory keys needed to make API calls.
  // Used by the UI to detect "user has config but needs to re-enter key this session".
  hasActiveKeys(): { ai: boolean; voice: boolean } {
    return {
      ai: !!inMemoryKeys.ai,
      voice: !!inMemoryKeys.voice,
    };
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
        return apiKey.length > 20;
      case 'elevenlabs':
        return apiKey.length > 20;
      default:
        return apiKey.length > 10;
    }
  }

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

  getCostEstimate(provider: AIProviderConfig, inputTokens: number = 2000, outputTokens: number = 1000): number {
    const costPerToken = provider.costPerToken || 0.00003;
    return (inputTokens + outputTokens) * costPerToken;
  }

  // Export config for backup/sharing — never includes the actual key
  exportConfig(): string {
    const config = this.loadConfig();
    const exportConfig = {
      ...config,
      aiProvider: config.aiProvider ? this.stripKey(config.aiProvider) : null,
      voiceProvider: config.voiceProvider ? this.stripKey(config.voiceProvider) : null,
    };
    return JSON.stringify(exportConfig, null, 2);
  }

  private checkIfConfigured(config: BYOKConfig): boolean {
    if (config.setupPath === 'managed') {
      return true;
    }
    return !!(config.aiProvider?.apiKey && config.voiceProvider?.apiKey);
  }

  private stripKey<T extends { apiKey: string }>(obj: T): Omit<T, 'apiKey'> {
    const { apiKey, ...rest } = obj;
    return rest;
  }

  // One-time cleanup of any pre-2.0.0 BYOK config that may have stored plaintext keys
  private purgeUnsafeLegacyConfigs(): void {
    try {
      const stored = localStorage.getItem(BYOK_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed.version !== BYOK_VERSION) {
        console.warn('Purging legacy BYOK config (may contain plaintext keys)');
        localStorage.removeItem(BYOK_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }
}
