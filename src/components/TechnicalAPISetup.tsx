import { useState } from 'react';
import { useBYOK } from '../hooks/useBYOK';
import { AI_PROVIDERS, ELEVENLABS_CONFIG } from '../config/providers';
import type { AIProvider, VoiceProvider, AIProviderConfig, VoiceProviderConfig } from '../types/byok';

interface TechnicalAPISetupProps {
  onComplete: () => void;
  onBack: () => void;
}

export function TechnicalAPISetup({ onComplete, onBack }: TechnicalAPISetupProps) {
  const {
    updateAIProvider,
    updateVoiceProvider,
    testAIConnection,
    validateAPIKey,
    getCostEstimate,
    testingConnection
  } = useBYOK();
  
  const [aiProvider, setAIProvider] = useState<AIProvider>('openai');
  const [aiApiKey, setAIApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState(AI_PROVIDERS.openai.defaultModel);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  
  const [voiceApiKey, setVoiceApiKey] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [voiceName, setVoiceName] = useState('');
  
  const [errors, setErrors] = useState<{ ai?: string; voice?: string }>({});
  const [testResults, setTestResults] = useState<{ ai?: boolean }>({});

  const selectedProvider = AI_PROVIDERS[aiProvider];
  const selectedModel = selectedProvider.models.find(m => m.id === model);
  const costEstimate = selectedModel ? getCostEstimate({
    id: aiProvider,
    name: selectedProvider.name,
    apiKey: aiApiKey,
    model,
    temperature,
    maxTokens,
    costPerToken: selectedModel.costPerToken
  }) : 0;

  const handleProviderChange = (newProvider: AIProvider) => {
    setAIProvider(newProvider);
    setModel(AI_PROVIDERS[newProvider].defaultModel);
    setTemperature(AI_PROVIDERS[newProvider].defaultSettings.temperature);
    setMaxTokens(AI_PROVIDERS[newProvider].defaultSettings.maxTokens);
    setBaseURL('');
    setErrors({ ...errors, ai: undefined });
  };

  const handleTestAI = async () => {
    if (!aiApiKey.trim()) {
      setErrors({ ...errors, ai: 'API key is required' });
      return;
    }

    if (!validateAPIKey(aiProvider, aiApiKey)) {
      setErrors({ ...errors, ai: 'Invalid API key format' });
      return;
    }

    const providerConfig: AIProviderConfig = {
      id: aiProvider,
      name: selectedProvider.name,
      apiKey: aiApiKey,
      baseURL: baseURL || undefined,
      model,
      temperature,
      maxTokens,
      costPerToken: selectedModel?.costPerToken
    };

    const testResult = await testAIConnection(providerConfig);
    if (testResult.success) {
      setTestResults({ ...testResults, ai: true });
      setErrors({ ...errors, ai: undefined });
    } else {
      setErrors({ ...errors, ai: testResult.error || 'Connection test failed' });
      setTestResults({ ...testResults, ai: false });
    }
  };

  const handleSaveAndComplete = () => {
    if (!aiApiKey.trim() || !voiceApiKey.trim()) {
      setErrors({
        ai: !aiApiKey.trim() ? 'AI API key is required' : undefined,
        voice: !voiceApiKey.trim() ? 'Voice API key is required' : undefined
      });
      return;
    }

    if (!validateAPIKey(aiProvider, aiApiKey) || !validateAPIKey('elevenlabs', voiceApiKey)) {
      setErrors({
        ai: !validateAPIKey(aiProvider, aiApiKey) ? 'Invalid AI API key format' : undefined,
        voice: !validateAPIKey('elevenlabs', voiceApiKey) ? 'Invalid voice API key format' : undefined
      });
      return;
    }

    const aiConfig: AIProviderConfig = {
      id: aiProvider,
      name: selectedProvider.name,
      apiKey: aiApiKey,
      baseURL: baseURL || undefined,
      model,
      temperature,
      maxTokens,
      costPerToken: selectedModel?.costPerToken
    };

    const voiceConfig: VoiceProviderConfig = {
      id: 'elevenlabs' as VoiceProvider,
      name: ELEVENLABS_CONFIG.name,
      apiKey: voiceApiKey,
      selectedVoiceId: voiceId || undefined,
      selectedVoiceName: voiceName || undefined
    };

    updateAIProvider(aiConfig);
    updateVoiceProvider(voiceConfig);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Technical Configuration</h1>
          <p className="text-dark-300">Advanced API configuration and model parameters</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Provider Configuration */}
          <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700 space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <span className="text-2xl mr-3">🤖</span>
              AI Provider Configuration
            </h2>

            {/* Provider Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-200">Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((provider) => (
                  <option key={provider} value={provider}>
                    {AI_PROVIDERS[provider].name}
                  </option>
                ))}
              </select>
            </div>

            {/* BYOK Disclosure */}
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 text-xs text-amber-100">
              <p className="font-semibold mb-1">Key safety:</p>
              <p className="text-amber-200/90">
                Your API key is held in memory only — never written to storage, database, or logs. Cleared on page reload. You'll re-enter it each session.
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-200">API Key</label>
              <div className="space-y-2">
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAIApiKey(e.target.value)}
                  placeholder={`${selectedProvider.name} API key`}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                {errors.ai && (
                  <p className="text-red-400 text-sm">{errors.ai}</p>
                )}
              </div>
            </div>

            {/* Base URL (optional) */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-200">
                Base URL <span className="text-dark-400">(optional)</span>
              </label>
              <input
                type="url"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="Custom API endpoint URL"
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-200">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {selectedProvider.models.map((modelInfo) => (
                  <option key={modelInfo.id} value={modelInfo.id}>
                    {modelInfo.name} - ${(modelInfo.costPerToken * 1000000).toFixed(2)}/1M tokens
                  </option>
                ))}
              </select>
              {selectedModel && (
                <p className="text-xs text-dark-400">{selectedModel.description}</p>
              )}
            </div>

            {/* Temperature */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-200">
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-dark-400">
                Lower values = more focused, Higher values = more creative
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-200">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
                min="1"
                max="8000"
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Cost Estimate */}
            <div className="bg-dark-700/50 rounded-lg p-3">
              <p className="text-sm text-dark-200">
                Estimated cost per session: <span className="text-green-400">${costEstimate.toFixed(4)}</span>
              </p>
              <p className="text-xs text-dark-400">Based on 2000 input + 1000 output tokens</p>
            </div>

            {/* Test Connection */}
            <button
              onClick={handleTestAI}
              disabled={!aiApiKey.trim() || testingConnection}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                testResults.ai === true
                  ? 'bg-green-600/20 text-green-400 border border-green-600/50'
                  : testResults.ai === false
                  ? 'bg-red-600/20 text-red-400 border border-red-600/50'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-dark-700 disabled:text-dark-400'
              }`}
            >
              {testingConnection 
                ? 'Testing...' 
                : testResults.ai === true 
                ? '✓ Connection Verified' 
                : testResults.ai === false
                ? '✗ Test Failed'
                : 'Test Connection'
              }
            </button>
          </div>

          {/* Voice Provider Configuration */}
          <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700 space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <span className="text-2xl mr-3">🎙️</span>
              Voice Provider Configuration
            </h2>

            {/* Provider Info */}
            <div className="bg-dark-700/50 rounded-lg p-4">
              <h3 className="font-semibold text-white">{ELEVENLABS_CONFIG.name}</h3>
              <p className="text-sm text-dark-300 mt-1">{ELEVENLABS_CONFIG.description}</p>
            </div>

            {/* API Key */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-200">API Key</label>
              <div className="space-y-2">
                <input
                  type="password"
                  value={voiceApiKey}
                  onChange={(e) => setVoiceApiKey(e.target.value)}
                  placeholder="ElevenLabs API key"
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
                {errors.voice && (
                  <p className="text-red-400 text-sm">{errors.voice}</p>
                )}
              </div>
            </div>

            {/* Voice Selection (Optional) */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-200">
                Preferred Voice <span className="text-dark-400">(optional)</span>
              </label>
              <input
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="Voice ID (e.g., pNInz6obpgDQGcFmaJgB)"
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-200">
                Voice Name <span className="text-dark-400">(for reference)</span>
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., Adam, Rachel, Morgan Freeman"
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* Features */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-dark-200">Features Available</h4>
              <div className="space-y-2">
                {ELEVENLABS_CONFIG.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-dark-300">
                    <span className="text-green-400 mr-2">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Info */}
            <div className="bg-dark-700/50 rounded-lg p-3">
              <p className="text-sm text-dark-200">
                Estimated cost: <span className="text-purple-400">~$0.02</span> per learning session
              </p>
              <p className="text-xs text-dark-400">Based on ~200 characters of generated speech</p>
            </div>

            {/* API Key Instructions */}
            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/50">
              <p className="text-xs text-blue-300">
                Get your API key at{' '}
                <a
                  href="https://elevenlabs.io/app/developers/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  elevenlabs.io &rarr; Developers &rarr; API Keys
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center pt-6">
          <button
            onClick={onBack}
            className="px-6 py-3 text-dark-400 hover:text-dark-300 transition-colors"
          >
            Back to Setup Path
          </button>
          <button
            onClick={handleSaveAndComplete}
            disabled={!aiApiKey.trim() || !voiceApiKey.trim()}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-dark-700 disabled:to-dark-700 disabled:text-dark-400 disabled:cursor-not-allowed transform hover:scale-105 transition-all shadow-lg"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}