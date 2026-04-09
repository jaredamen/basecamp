import { useState } from 'react';
import { OPENAI_VOICES, type OpenAIVoiceId } from '../hooks/useManagedTTS';

interface ManagedVoiceSelectorProps {
  selectedVoice: OpenAIVoiceId;
  onVoiceChange: (voice: OpenAIVoiceId) => void;
  onPreview?: (voice: OpenAIVoiceId) => Promise<string | null>;
}

export function ManagedVoiceSelector({
  selectedVoice,
  onVoiceChange,
  onPreview,
}: ManagedVoiceSelectorProps) {
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const handlePreview = async (voiceId: OpenAIVoiceId) => {
    if (!onPreview) return;

    // Stop any existing preview
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
    }

    setPreviewing(voiceId);
    const url = await onPreview(voiceId);

    if (url) {
      const audio = new Audio(url);
      audio.onended = () => {
        setPreviewing(null);
        URL.revokeObjectURL(url);
      };
      audio.play();
      setPreviewAudio(audio);
    } else {
      setPreviewing(null);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-dark-200">Voice</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {OPENAI_VOICES.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onVoiceChange(voice.id)}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedVoice === voice.id
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">{voice.name}</div>
                <div className="text-xs text-dark-400">{voice.description}</div>
              </div>
              {onPreview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(voice.id);
                  }}
                  disabled={previewing !== null}
                  className="text-xs text-purple-400 hover:text-purple-300 disabled:text-dark-500"
                >
                  {previewing === voice.id ? '...' : '▶'}
                </button>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
