import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface DocumentationInputProps {
  onGenerate: (content: { url?: string; text?: string; type: 'url' | 'text' }) => void;
  isGenerating?: boolean;
}

const validateUrl = (urlString: string): boolean => {
  try {
    const urlObj = new URL(urlString);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

export function DocumentationInput({ onGenerate, isGenerating = false }: DocumentationInputProps) {
  const [inputType, setInputType] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<{ url?: string; text?: string }>({});
  const handledExtensionParams = useRef(false);

  // Auto-submit when launched from the Chrome extension. The extension opens
  // /?source=ext&url=...&selection=... ; we honour the URL or selection,
  // strip the params from the address bar, and kick off generation immediately.
  useEffect(() => {
    if (handledExtensionParams.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') !== 'ext') return;
    handledExtensionParams.current = true;

    const extUrl = params.get('url') ?? '';
    const extSelection = params.get('selection') ?? '';

    window.history.replaceState({}, '', window.location.pathname);

    if (extSelection.trim().length >= 50) {
      setInputType('text');
      setText(extSelection);
      onGenerate({ text: extSelection.trim(), type: 'text' });
      return;
    }
    if (extUrl && validateUrl(extUrl)) {
      setInputType('url');
      setUrl(extUrl);
      onGenerate({ url: extUrl.trim(), type: 'url' });
    }
  }, [onGenerate]);

  const handleGenerate = () => {
    setErrors({});

    if (inputType === 'url') {
      if (!url.trim()) {
        setErrors({ url: 'URL is required' });
        return;
      }
      if (!validateUrl(url)) {
        setErrors({ url: 'Please enter a valid HTTP/HTTPS URL' });
        return;
      }
      onGenerate({ url: url.trim(), type: 'url' });
    } else {
      if (!text.trim()) {
        setErrors({ text: 'Content is required' });
        return;
      }
      if (text.trim().length < 50) {
        setErrors({ text: 'Content must be at least 50 characters' });
        return;
      }
      onGenerate({ text: text.trim(), type: 'text' });
    }
  };

  const exampleUrls = [
    { name: 'Stoic Philosophy', url: 'https://en.wikipedia.org/wiki/Stoicism' },
    { name: 'React Docs', url: 'https://react.dev/learn' },
    { name: 'History of Jazz', url: 'https://en.wikipedia.org/wiki/Jazz' },
    { name: 'Anime & Manga', url: 'https://en.wikipedia.org/wiki/Anime' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-solar-900 via-solar-800 to-solar-900 py-8 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-solar-100">
            Learn Anything, Your Way
          </h1>
          <p className="text-xl text-solar-gold/90">
            Paste a URL or any text — we'll turn it into flashcards and expert audio lessons
          </p>
        </div>

        {/* Input Type Selection */}
        <div className="flex justify-center">
          <div className="glass rounded-lg p-1">
            <button
              onClick={() => setInputType('url')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                inputType === 'url'
                  ? 'bg-solar-gold text-solar-900 shadow-lg'
                  : 'text-solar-400 hover:text-solar-100 hover:bg-solar-700/40'
              }`}
            >
              From a URL
            </button>
            <button
              onClick={() => setInputType('text')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                inputType === 'text'
                  ? 'bg-solar-amber text-solar-900 shadow-lg'
                  : 'text-solar-400 hover:text-solar-100 hover:bg-solar-700/40'
              }`}
            >
              Paste Content
            </button>
          </div>
        </div>

        {/* Main Input Area */}
        <div className="max-w-2xl mx-auto space-y-6">
          {inputType === 'url' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-lg font-medium text-solar-100">
                  Paste any URL
                </label>
                <p className="text-sm text-solar-400">
                  Wiki pages, articles, documentation, blog posts, research papers — anything with text
                </p>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://en.wikipedia.org/wiki/Stoicism"
                  className="w-full px-4 py-3 glass rounded-lg text-solar-100 text-lg focus:border-solar-gold focus:ring-2 focus:ring-solar-gold/20 outline-none transition-colors"
                />
                {errors.url && (
                  <p className="text-solar-ember text-sm">{errors.url}</p>
                )}
              </div>

              {/* Example URLs */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-solar-100">Try these:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exampleUrls.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setUrl(example.url)}
                      className="text-left p-3 glass rounded-lg hover:border-solar-gold/35 hover:bg-solar-800/40 transition-colors group"
                    >
                      <div className="text-sm font-medium text-solar-gold group-hover:text-solar-amber">
                        {example.name}
                      </div>
                      <div className="text-xs text-solar-500 truncate font-mono">
                        {example.url}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-lg font-medium text-solar-100">
                  Your Content
                </label>
                <p className="text-sm text-solar-400">
                  Paste anything — articles, notes, poems, documentation, papers, or any text you want to learn from
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Paste any content you want to learn from...

For example:
- A Wikipedia article about ancient Rome
- Notes from a lecture on quantum physics
- A poem you want to analyze and understand
- Technical documentation for an API
- A chapter from a philosophy book

The AI will extract key concepts, create flashcards for active recall, and write an expert audio lesson that teaches through analogies and stories.`}
                  rows={12}
                  className="w-full px-4 py-3 glass rounded-lg text-solar-100 text-sm focus:border-solar-amber focus:ring-2 focus:ring-solar-amber/20 outline-none transition-colors resize-y"
                />
                {errors.text && (
                  <p className="text-solar-ember text-sm">{errors.text}</p>
                )}
                <div className="flex justify-between text-xs text-solar-500 font-mono">
                  <span>Minimum 50 characters required</span>
                  <span>{text.length} characters</span>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <motion.button
              onClick={handleGenerate}
              disabled={isGenerating || (!url.trim() && !text.trim())}
              whileHover={{ scale: isGenerating ? 1 : 1.03 }}
              whileTap={{ scale: isGenerating ? 1 : 0.97 }}
              className="px-8 py-4 bg-gradient-to-r from-solar-gold to-solar-amber text-solar-900 rounded-lg font-semibold text-lg hover:from-solar-amber hover:to-solar-ember disabled:from-solar-700 disabled:to-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed transition-all shadow-lg shadow-solar-gold/20"
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Generating...
                </span>
              ) : (
                'Generate Learning Content'
              )}
            </motion.button>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
            <div className="text-center p-4 glass rounded-lg">
              <div className="text-3xl mb-2">🧠</div>
              <h3 className="font-semibold text-solar-100">Smart Flashcards</h3>
              <p className="text-xs text-solar-400 mt-1">
                Key ideas extracted and turned into study cards
              </p>
            </div>

            <div className="text-center p-4 glass rounded-lg">
              <div className="text-3xl mb-2">🎙️</div>
              <h3 className="font-semibold text-solar-100">Expert Audio</h3>
              <p className="text-xs text-solar-400 mt-1">
                Listen to expert explanations using analogies and stories
              </p>
            </div>

            <div className="text-center p-4 glass rounded-lg">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold text-solar-100">Actually Remember</h3>
              <p className="text-xs text-solar-400 mt-1">
                Content designed to help you understand and retain
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
