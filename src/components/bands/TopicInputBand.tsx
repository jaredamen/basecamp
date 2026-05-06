import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Link2, Search, FileText } from 'lucide-react';
import { wikiSearch, fallbackWikiUrl, type WikiResult } from '../../services/wikiSearch';

interface TopicInputBandProps {
  onGenerate: (input: { url?: string; text?: string; type: 'url' | 'text' }) => void;
  isGenerating?: boolean;
}

type Mode = 'empty' | 'url' | 'topic' | 'text';

const TOPIC_MAX_LEN = 80;
const TEXT_MIN_LEN = 50;
const DEBOUNCE_MS = 200;

const EXAMPLE_CHIPS = ['Stoicism', 'React', 'Jazz', 'Anime'];

function detectMode(input: string): Mode {
  const trimmed = input.trim();
  if (!trimmed) return 'empty';
  // URL: parses as http(s) URL.
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return 'url';
  } catch {
    // not a URL
  }
  // Topic: short, single-line.
  if (trimmed.length <= TOPIC_MAX_LEN && !trimmed.includes('\n')) return 'topic';
  // Otherwise text mode.
  return 'text';
}

/**
 * The single-slot topic input. Replaces the legacy DocumentationInput
 * (h1 + URL/text toggle + 4 example URLs in a 2x2 + 3 marketing
 * cards) with one textarea that auto-detects three modes:
 *
 *   - URL:    paste an http(s) URL
 *   - Topic:  short non-URL → autocompleted via Wikipedia search,
 *             user picks one of the chips OR Generate auto-routes to
 *             the top match
 *   - Text:   multi-line OR ≥80 chars → use as-is
 *
 * Wikipedia OpenSearch handles typos, natural-language queries, and
 * disambiguation. No client-side NLP library; the smarts live in
 * Wikipedia's API and we just render the chips.
 */
export function TopicInputBand({ onGenerate, isGenerating = false }: TopicInputBandProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WikiResult[]>([]);
  const [searching, setSearching] = useState(false);
  const handledExtensionParams = useRef(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  const mode = detectMode(input);

  // Auto-submit when launched from the Chrome extension. Same logic
  // as the old DocumentationInput — preserved verbatim. /?source=ext
  // &url=... or &selection=...
  useEffect(() => {
    if (handledExtensionParams.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') !== 'ext') return;
    handledExtensionParams.current = true;

    const extUrl = params.get('url') ?? '';
    const extSelection = params.get('selection') ?? '';
    window.history.replaceState({}, '', window.location.pathname);

    if (extSelection.trim().length >= TEXT_MIN_LEN) {
      onGenerate({ text: extSelection.trim(), type: 'text' });
      return;
    }
    if (extUrl) {
      try {
        const u = new URL(extUrl);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          onGenerate({ url: extUrl.trim(), type: 'url' });
        }
      } catch {
        // invalid URL; ignore
      }
    }
  }, [onGenerate]);

  // Debounced topic-mode autocomplete. On every keystroke in topic
  // mode, cancel any in-flight search and queue a new one ~200ms out.
  useEffect(() => {
    if (mode !== 'topic') {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = window.setTimeout(async () => {
      // Cancel any older search still in flight.
      searchAbortRef.current?.abort();
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;
      const r = await wikiSearch(input, ctrl.signal);
      // Only commit if this is still the active search.
      if (ctrl.signal.aborted) return;
      setResults(r);
      setSearching(false);
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(handle);
    };
  }, [input, mode]);

  // Clear error when the user edits the input.
  useEffect(() => {
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const submitTopic = (topic: string, urlOverride?: string) => {
    if (urlOverride) {
      onGenerate({ url: urlOverride, type: 'url' });
      return;
    }
    if (results.length > 0) {
      onGenerate({ url: results[0].url, type: 'url' });
      return;
    }
    // No autocomplete results yet — try a synchronous lookup, then
    // fall back to URL-construction if the API is unreachable.
    void (async () => {
      const r = await wikiSearch(topic);
      if (r.length > 0) {
        onGenerate({ url: r[0].url, type: 'url' });
      } else {
        // Last-resort: construct a URL and let fetch-url try.
        // If that 404s, useContentGeneration's catch surfaces the
        // friendly error. (Better than a hard fail here.)
        onGenerate({ url: fallbackWikiUrl(topic), type: 'url' });
      }
    })();
  };

  const handleGenerate = () => {
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) return;

    if (mode === 'url') {
      onGenerate({ url: trimmed, type: 'url' });
      return;
    }
    if (mode === 'text') {
      if (trimmed.length < TEXT_MIN_LEN) {
        setError(`That's only ${trimmed.length} characters — need at least ${TEXT_MIN_LEN} for text mode.`);
        return;
      }
      onGenerate({ text: trimmed, type: 'text' });
      return;
    }
    // Topic mode: auto-route via best Wikipedia match.
    submitTopic(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter (without Shift) submits. Shift+Enter inserts a newline
    // — once a newline is present, mode flips to text automatically.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleChipClick = (topic: string) => {
    setInput(topic);
  };

  const handleResultClick = (result: WikiResult) => {
    onGenerate({ url: result.url, type: 'url' });
  };

  const modeHint = useMemo(() => {
    if (mode === 'url') return 'URL detected';
    if (mode === 'text') return `text · ${input.trim().length} chars`;
    if (mode === 'topic') {
      if (searching) return 'searching Wikipedia…';
      if (results.length === 0 && input.trim().length > 1) return 'no Wikipedia matches yet — keep typing or Generate to try anyway';
      if (results.length > 0) return `topic · ${results.length} match${results.length === 1 ? '' : 'es'} on Wikipedia`;
      return 'topic · I\'ll look it up on Wikipedia';
    }
    return '';
  }, [mode, input, searching, results.length]);

  const canGenerate = input.trim().length > 0 && !isGenerating;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-3"
    >
      {/* Mode-icon strip — three options always visible so users discover
          all three input modes (URL was easy to miss). The icon for the
          auto-detected mode lights up; the others stay dimmed. */}
      <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-wider">
        <ModeChip icon={Link2} label="URL" active={mode === 'url'} />
        <span className="text-solar-700">·</span>
        <ModeChip icon={Search} label="topic" active={mode === 'topic'} />
        <span className="text-solar-700">·</span>
        <ModeChip icon={FileText} label="text" active={mode === 'text'} />
      </div>

      <div className="w-full glass rounded-2xl p-1.5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`paste a URL · type a topic · or drop in your own text\n\ntry "stoicism", "https://en.wikipedia.org/wiki/Jazz", or paste a passage`}
          rows={3}
          autoFocus
          className="w-full bg-transparent rounded-xl px-4 py-3 text-solar-100 text-base focus:outline-none resize-y placeholder:text-solar-500/70 placeholder:whitespace-pre-line"
          disabled={isGenerating}
        />
      </div>

      {/* Mode hint — mono, small, just enough to telegraph the mode */}
      <div className="h-4 flex items-center gap-2 text-[11px] font-mono text-solar-500">
        {searching && <Loader2 className="w-3 h-3 animate-spin" />}
        <span>{modeHint}</span>
      </div>

      {/* Topic-mode autocomplete chips. Click one to submit immediately. */}
      <AnimatePresence>
        {mode === 'topic' && results.length > 0 && (
          <motion.div
            key="autocomplete"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap justify-center gap-2 max-w-2xl"
          >
            {results.slice(0, 4).map((r) => (
              <button
                key={r.url}
                type="button"
                onClick={() => handleResultClick(r)}
                title={r.description || r.title}
                className="text-xs px-3 py-1.5 rounded-full bg-solar-gold/15 border border-solar-gold/40 text-solar-gold hover:bg-solar-gold/25 hover:border-solar-gold/60 transition-colors max-w-full sm:max-w-[280px] truncate"
              >
                {r.title}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline error (e.g. text-too-short) */}
      {error && (
        <p className="text-xs text-solar-ember">{error}</p>
      )}

      {/* Generate button */}
      <motion.button
        onClick={handleGenerate}
        disabled={!canGenerate}
        whileHover={canGenerate ? { scale: 1.03 } : undefined}
        whileTap={canGenerate ? { scale: 0.97 } : undefined}
        className="px-7 py-3 bg-gradient-to-r from-solar-gold to-solar-amber text-solar-900 rounded-full font-semibold text-base hover:from-solar-amber hover:to-solar-ember disabled:from-solar-700 disabled:to-solar-700 disabled:text-solar-500 disabled:cursor-not-allowed transition-all shadow-lg shadow-solar-gold/20"
      >
        {isGenerating ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating…
          </span>
        ) : (
          'Generate'
        )}
      </motion.button>

      {/* Starter chip row — bare topic names, click → fills + topic mode picks it up */}
      {input.trim() === '' && !isGenerating && (
        <div className="flex flex-col items-center gap-2 mt-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-solar-500/80">try one</span>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_CHIPS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleChipClick(topic)}
                className="text-xs px-3 py-1.5 rounded-full bg-solar-amber/15 border border-solar-amber/40 text-solar-amber hover:bg-solar-amber/25 hover:border-solar-amber/60 transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ModeChip({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof Link2;
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 transition-colors ${
        active ? 'text-solar-gold' : 'text-solar-500/70'
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
