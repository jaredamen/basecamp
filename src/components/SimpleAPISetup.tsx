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
    <div className="space-y-6 flex flex-col justify-center px-6">
      <div className="max-w-lg mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-solar-100">Bring your OpenAI key</h1>
          <p className="text-solar-400">Paste it below. We test it, then you're in.</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-solar-100">OpenAI API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoFocus
            className="w-full px-4 py-3 bg-solar-800 border border-solar-gold/15 rounded-lg text-solar-100 focus:border-solar-gold focus:ring-1 focus:ring-solar-gold outline-none font-mono text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="bg-solar-800/40 rounded-lg p-4 border border-solar-gold/15 text-sm text-solar-400 space-y-2">
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
              className="text-solar-gold hover:text-solar-gold underline"
            >
              Get one from OpenAI
            </a>
            .
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onBack}
            className="px-5 py-3 text-solar-500 hover:text-solar-400 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!apiKey.trim() || testingConnection}
            className="flex-1 px-5 py-3 bg-solar-gold text-solar-100 rounded-lg font-semibold hover:bg-solar-amber disabled:bg-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed transition-colors"
          >
            {testingConnection ? 'Testing…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
