import { useEffect, useRef, useState } from 'react';

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
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">
            Learn Anything, Your Way
          </h1>
          <p className="text-xl text-blue-300">
            Paste a URL or any text — we'll turn it into flashcards and expert audio lessons
          </p>
        </div>

        {/* Input Type Selection */}
        <div className="flex justify-center">
          <div className="bg-dark-800/50 rounded-lg p-1 border border-dark-700">
            <button
              onClick={() => setInputType('url')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                inputType === 'url'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-dark-300 hover:text-white hover:bg-dark-700'
              }`}
            >
              From a URL
            </button>
            <button
              onClick={() => setInputType('text')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                inputType === 'text'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-dark-300 hover:text-white hover:bg-dark-700'
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
                <label className="block text-lg font-medium text-white">
                  Paste any URL
                </label>
                <p className="text-sm text-dark-300">
                  Wiki pages, articles, documentation, blog posts, research papers — anything with text
                </p>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://en.wikipedia.org/wiki/Stoicism"
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                />
                {errors.url && (
                  <p className="text-red-400 text-sm">{errors.url}</p>
                )}
              </div>

              {/* Example URLs */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-dark-200">Try these:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exampleUrls.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setUrl(example.url)}
                      className="text-left p-3 bg-dark-800/50 rounded-lg border border-dark-700 hover:border-dark-600 hover:bg-dark-800 transition-colors group"
                    >
                      <div className="text-sm font-medium text-blue-400 group-hover:text-blue-300">
                        {example.name}
                      </div>
                      <div className="text-xs text-dark-400 truncate">
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
                <label className="block text-lg font-medium text-white">
                  Your Content
                </label>
                <p className="text-sm text-dark-300">
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
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-colors resize-y"
                />
                {errors.text && (
                  <p className="text-red-400 text-sm">{errors.text}</p>
                )}
                <div className="flex justify-between text-xs text-dark-400">
                  <span>Minimum 50 characters required</span>
                  <span>{text.length} characters</span>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!url.trim() && !text.trim())}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:from-dark-700 disabled:to-dark-700 disabled:text-dark-400 disabled:cursor-not-allowed transform hover:scale-105 transition-all shadow-lg"
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate Learning Content'
              )}
            </button>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
            <div className="text-center p-4 bg-dark-800/30 rounded-lg border border-dark-700">
              <div className="text-3xl mb-2">🧠</div>
              <h3 className="font-semibold text-white">Smart Flashcards</h3>
              <p className="text-xs text-dark-400 mt-1">
                Key ideas extracted and turned into study cards
              </p>
            </div>

            <div className="text-center p-4 bg-dark-800/30 rounded-lg border border-dark-700">
              <div className="text-3xl mb-2">🎙️</div>
              <h3 className="font-semibold text-white">Expert Audio</h3>
              <p className="text-xs text-dark-400 mt-1">
                Listen to expert explanations using analogies and stories
              </p>
            </div>

            <div className="text-center p-4 bg-dark-800/30 rounded-lg border border-dark-700">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold text-white">Actually Remember</h3>
              <p className="text-xs text-dark-400 mt-1">
                Content designed to help you understand and retain
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
