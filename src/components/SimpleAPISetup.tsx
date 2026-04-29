import { useState } from 'react';
import { useBYOK } from '../hooks/useBYOK';
import { AI_PROVIDERS } from '../config/providers';
import type { AIProviderConfig } from '../types/byok';

interface SimpleAPISetupProps {
  onComplete: () => void;
  onBack: () => void;
}

/**
 * Single-screen BYOK setup: paste an OpenAI key, we test it, you're in.
 *
 * SLC simplification — used to be a 2-step flow with provider selection
 * (OpenAI / Anthropic / Google) and a separate ElevenLabs voice-key step.
 * Now: OpenAI only, voice is server-side nova for everyone, one input box.
 */
export function SimpleAPISetup({ onComplete, onBack }: SimpleAPISetupProps) {
  const { updateAIProvider, testAIConnection, validateAPIKey, testingConnection } = useBYOK();

  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const openaiInfo = AI_PROVIDERS.openai;

  const handleSubmit = async () => {
    setError(null);

    if (!apiKey.trim()) {
      setError('OpenAI API key is required');
      return;
    }
    if (!validateAPIKey('openai', apiKey)) {
      setError('That doesn\'t look like a valid OpenAI key. Should start with "sk-".');
      return;
    }

    const providerConfig: AIProviderConfig = {
      id: 'openai',
      name: openaiInfo.name,
      apiKey,
      model: openaiInfo.defaultModel,
      temperature: openaiInfo.defaultSettings.temperature,
      maxTokens: openaiInfo.defaultSettings.maxTokens,
      costPerToken: openaiInfo.models.find(m => m.id === openaiInfo.defaultModel)?.costPerToken,
    };

    const testResult = await testAIConnection(providerConfig);
    if (!testResult.success) {
      setError(testResult.error || 'Could not reach OpenAI with that key. Check it and try again.');
      return;
    }

    updateAIProvider(providerConfig);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col justify-center px-6">
      <div className="max-w-lg mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Bring your OpenAI key</h1>
          <p className="text-dark-300">Paste it below. We test it, then you're in.</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-dark-200">OpenAI API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoFocus
            className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="bg-dark-800/40 rounded-lg p-4 border border-dark-700 text-sm text-dark-300 space-y-2">
          <p>
            Your key is held in memory for this session only and never stored.
            You'll re-enter it next visit.
          </p>
          <p>
            Don't have one?{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Get one from OpenAI
            </a>
            .
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onBack}
            className="px-5 py-3 text-dark-400 hover:text-dark-300 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!apiKey.trim() || testingConnection}
            className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-dark-700 disabled:text-dark-400 disabled:cursor-not-allowed transition-colors"
          >
            {testingConnection ? 'Testing…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
