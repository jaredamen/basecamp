import { useState } from 'react';
import { useBYOK } from '../hooks/useBYOK';
import { AI_PROVIDERS, ELEVENLABS_CONFIG } from '../config/providers';
import type { AIProvider, VoiceProvider, AIProviderConfig, VoiceProviderConfig } from '../types/byok';

interface SimpleAPISetupProps {
  onComplete: () => void;
  onBack: () => void;
}

export function SimpleAPISetup({ onComplete, onBack }: SimpleAPISetupProps) {
  const {
    updateAIProvider,
    updateVoiceProvider,
    testAIConnection,
    validateAPIKey,
    testingConnection
  } = useBYOK();
  
  const [currentStep, setCurrentStep] = useState<'ai' | 'voice' | 'complete'>('ai');
  const [selectedAI, setSelectedAI] = useState<AIProvider>('openai');
  const [aiApiKey, setAIApiKey] = useState('');
  const [voiceApiKey, setVoiceApiKey] = useState('');
  const [errors, setErrors] = useState<{ ai?: string; voice?: string }>({});
  const [testResults, setTestResults] = useState<{ ai?: boolean; voice?: boolean }>({});

  const handleAINext = async () => {
    if (!aiApiKey.trim()) {
      setErrors({ ...errors, ai: 'API key is required' });
      return;
    }

    if (!validateAPIKey(selectedAI, aiApiKey)) {
      setErrors({ ...errors, ai: 'Invalid API key format' });
      return;
    }

    const providerInfo = AI_PROVIDERS[selectedAI];
    const providerConfig: AIProviderConfig = {
      id: selectedAI,
      name: providerInfo.name,
      apiKey: aiApiKey,
      model: providerInfo.defaultModel,
      temperature: providerInfo.defaultSettings.temperature,
      maxTokens: providerInfo.defaultSettings.maxTokens,
      costPerToken: providerInfo.models.find(m => m.id === providerInfo.defaultModel)?.costPerToken
    };

    const testResult = await testAIConnection(providerConfig);
    if (!testResult.success) {
      setErrors({ ...errors, ai: testResult.error || 'Connection test failed' });
      return;
    }

    updateAIProvider(providerConfig);
    setTestResults({ ...testResults, ai: true });
    setErrors({ ...errors, ai: undefined });
    setCurrentStep('voice');
  };

  const handleVoiceNext = () => {
    if (!voiceApiKey.trim()) {
      setErrors({ ...errors, voice: 'API key is required' });
      return;
    }

    if (!validateAPIKey('elevenlabs', voiceApiKey)) {
      setErrors({ ...errors, voice: 'Invalid API key format' });
      return;
    }

    const voiceConfig: VoiceProviderConfig = {
      id: 'elevenlabs' as VoiceProvider,
      name: ELEVENLABS_CONFIG.name,
      apiKey: voiceApiKey
    };

    updateVoiceProvider(voiceConfig);
    setTestResults({ ...testResults, voice: true });
    setErrors({ ...errors, voice: undefined });
    setCurrentStep('complete');
  };

  const handleComplete = () => {
    onComplete();
  };

  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col justify-center px-6">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-white">Setup Complete!</h1>
          <p className="text-xl text-green-300">
            Your API keys are configured and ready to use
          </p>
          
          <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-dark-300">AI Provider</span>
              <div className="flex items-center space-x-2">
                <span className="text-white">{AI_PROVIDERS[selectedAI].name}</span>
                <span className="text-green-400">✓</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-300">Voice Provider</span>
              <div className="flex items-center space-x-2">
                <span className="text-white">ElevenLabs</span>
                <span className="text-green-400">✓</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transform hover:scale-105 transition-all shadow-lg"
          >
            Start Learning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col justify-center px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep === 'ai' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
          }`}>
            1
          </div>
          <div className={`h-1 w-16 ${currentStep === 'voice' ? 'bg-blue-600' : 'bg-dark-600'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep === 'ai' ? 'bg-dark-600 text-dark-300' : 'bg-blue-600 text-white'
          }`}>
            2
          </div>
        </div>

        {currentStep === 'ai' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-white">Setup AI Provider</h1>
              <p className="text-dark-300">Choose your preferred AI provider and enter your API key</p>
            </div>

            {/* AI Provider Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-dark-200">AI Provider</label>
              <div className="grid gap-3">
                {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setSelectedAI(provider)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedAI === provider
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-white">{AI_PROVIDERS[provider].name}</h3>
                        <p className="text-sm text-dark-300 mt-1">{AI_PROVIDERS[provider].description}</p>
                      </div>
                      <div className="text-sm text-dark-400">
                        ${AI_PROVIDERS[provider].models[0].costPerToken * 1000000}/1M tokens
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-dark-200">API Key</label>
              <div className="space-y-2">
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAIApiKey(e.target.value)}
                  placeholder={`Enter your ${AI_PROVIDERS[selectedAI].name} API key`}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                {errors.ai && (
                  <p className="text-red-400 text-sm">{errors.ai}</p>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700">
              <h4 className="font-medium text-white mb-2">How to get your API key:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-dark-300">
                {AI_PROVIDERS[selectedAI].apiKeyInstructions.map((step, i) => (
                  <li key={i}>
                    {step.text}
                    {step.linkUrl && (
                      <a
                        href={step.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {step.linkText || step.linkUrl}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={onBack}
                className="px-6 py-3 text-dark-400 hover:text-dark-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleAINext}
                disabled={!aiApiKey.trim() || testingConnection}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-dark-700 disabled:text-dark-400 disabled:cursor-not-allowed transition-colors"
              >
                {testingConnection ? 'Testing Connection...' : 'Next: Voice Setup'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'voice' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-white">Setup Voice Provider</h1>
              <p className="text-dark-300">Connect ElevenLabs for premium text-to-speech</p>
            </div>

            {/* ElevenLabs Info */}
            <div className="bg-dark-800/50 rounded-lg p-6 border border-dark-700">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">🎙️</div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{ELEVENLABS_CONFIG.name}</h3>
                  <p className="text-dark-300 mt-1">{ELEVENLABS_CONFIG.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ELEVENLABS_CONFIG.features.slice(0, 3).map((feature, index) => (
                      <span key={index} className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-dark-200">ElevenLabs API Key</label>
              <div className="space-y-2">
                <input
                  type="password"
                  value={voiceApiKey}
                  onChange={(e) => setVoiceApiKey(e.target.value)}
                  placeholder="Enter your ElevenLabs API key"
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
                {errors.voice && (
                  <p className="text-red-400 text-sm">{errors.voice}</p>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700">
              <h4 className="font-medium text-white mb-2">How to get your API key:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-dark-300">
                {ELEVENLABS_CONFIG.apiKeyInstructions.map((step, i) => (
                  <li key={i}>
                    {step.text}
                    {step.linkUrl && (
                      <a
                        href={step.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline"
                      >
                        {step.linkText || step.linkUrl}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep('ai')}
                className="px-6 py-3 text-dark-400 hover:text-dark-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleVoiceNext}
                disabled={!voiceApiKey.trim()}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-dark-700 disabled:text-dark-400 disabled:cursor-not-allowed transition-colors"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}