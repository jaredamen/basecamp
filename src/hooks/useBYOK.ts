import { useState, useEffect, useCallback } from 'react';
import type { BYOKConfig, AIProviderConfig, VoiceProviderConfig, SetupPath } from '../types/byok';
import { BYOKStorage } from '../services/byokStorage';

export function useBYOK() {
  const [config, setConfig] = useState<BYOKConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  const storage = BYOKStorage.getInstance();

  useEffect(() => {
    const loadConfig = () => {
      try {
        const loadedConfig = storage.loadConfig();
        setConfig(loadedConfig);
      } catch (error) {
        console.error('Failed to load BYOK config:', error);
        setConfig(storage.createDefaultConfig());
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [storage]);

  const updateSetupPath = useCallback((setupPath: SetupPath) => {
    const updatedConfig = storage.updateSetupPath(setupPath);
    setConfig(updatedConfig);
  }, [storage]);

  const updateAIProvider = useCallback((providerConfig: AIProviderConfig) => {
    const updatedConfig = storage.updateAIProvider(providerConfig);
    setConfig(updatedConfig);
  }, [storage]);

  const updateVoiceProvider = useCallback((providerConfig: VoiceProviderConfig) => {
    const updatedConfig = storage.updateVoiceProvider(providerConfig);
    setConfig(updatedConfig);
  }, [storage]);

  const testAIConnection = useCallback(async (providerConfig: AIProviderConfig) => {
    setTestingConnection(true);
    try {
      const result = await storage.testAPIKey(providerConfig);
      return result;
    } finally {
      setTestingConnection(false);
    }
  }, [storage]);

  const validateAPIKey = useCallback((provider: string, apiKey: string) => {
    return storage.validateAPIKey(provider, apiKey);
  }, [storage]);

  const getCostEstimate = useCallback((
    provider: AIProviderConfig, 
    inputTokens: number = 2000, 
    outputTokens: number = 1000
  ) => {
    return storage.getCostEstimate(provider, inputTokens, outputTokens);
  }, [storage]);

  const clearConfig = useCallback(() => {
    const clearedConfig = storage.clearConfig();
    setConfig(clearedConfig);
  }, [storage]);

  const exportConfig = useCallback(() => {
    return storage.exportConfig();
  }, [storage]);

  // Helper functions
  const isConfigured = config?.isConfigured || false;
  const hasAIProvider = !!(config?.aiProvider?.apiKey);
  const hasVoiceProvider = !!(config?.voiceProvider?.apiKey);
  const setupPath = config?.setupPath || 'simple';
  const isManaged = config?.setupPath === 'managed';

  return {
    config,
    loading,
    testingConnection,
    
    // Status checks
    isConfigured,
    hasAIProvider,
    hasVoiceProvider,
    setupPath,
    isManaged,
    
    // Configuration methods
    updateSetupPath,
    updateAIProvider,
    updateVoiceProvider,
    
    // Validation and testing
    testAIConnection,
    validateAPIKey,
    getCostEstimate,
    
    // Utility methods
    clearConfig,
    exportConfig
  };
}