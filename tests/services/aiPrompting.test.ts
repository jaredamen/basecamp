// @vitest-environment node

import { describe, it, expect } from 'vitest';
import {
  AIPromptingService,
  extractTechnicalFlag,
  renderTechnicalDepthBlock,
} from '../../src/services/aiPrompting';

const service = AIPromptingService.getInstance();

// Realistic OpenAI response variations — these are the shapes the AI actually returns
// depending on the prompt and model temperature.

describe('parseFlashcardResponse', () => {
  it('handles standard "cards" key with front/back fields', () => {
    const json = JSON.stringify({
      title: 'Stoicism 101',
      description: 'Key concepts of Stoic philosophy',
      cards: [
        { front: 'What is Stoicism?', back: 'A philosophy of personal virtue and wisdom', difficulty: 'easy', tags: ['philosophy'] },
        { front: 'Who founded Stoicism?', back: 'Zeno of Citium', difficulty: 'easy', tags: ['history'] },
      ],
      metadata: { difficulty: 'beginner', estimatedTime: 5, topics: ['philosophy'] }
    });

    const { flashcards: result } = service.parseFlashcardResponse(json, 'test content', 'text');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].front).toBe('What is Stoicism?');
    expect(result.cards[0].back).toBe('A philosophy of personal virtue and wisdom');
    expect(result.title).toBe('Stoicism 101');
  });

  it('handles "flashcards" key instead of "cards"', () => {
    const json = JSON.stringify({
      title: 'Anime Basics',
      description: 'Introduction to anime',
      flashcards: [
        { front: 'What is anime?', back: 'Japanese animation' },
        { front: 'What is manga?', back: 'Japanese comics' },
      ],
    });

    const { flashcards: result } = service.parseFlashcardResponse(json, 'test', 'text');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].front).toBe('What is anime?');
  });

  it('handles "questions" key with question/answer fields', () => {
    const json = JSON.stringify({
      title: 'Quiz',
      questions: [
        { question: 'What is React?', answer: 'A JavaScript library for building UIs' },
        { question: 'What is JSX?', answer: 'A syntax extension for JavaScript' },
      ],
    });

    const { flashcards: result } = service.parseFlashcardResponse(json, 'test', 'text');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].front).toBe('What is React?');
    expect(result.cards[0].back).toBe('A JavaScript library for building UIs');
  });

  it('handles "items" key', () => {
    const json = JSON.stringify({
      title: 'Items',
      items: [
        { q: 'Shorthand?', a: 'Yes it works' },
      ],
    });

    const { flashcards: result } = service.parseFlashcardResponse(json, 'test', 'text');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].front).toBe('Shorthand?');
    expect(result.cards[0].back).toBe('Yes it works');
  });

  it('throws clear error when no cards found', () => {
    const json = JSON.stringify({ title: 'Empty', description: 'No cards here' });
    expect(() => service.parseFlashcardResponse(json, 'test', 'text'))
      .toThrow('AI returned no flashcards');
  });

  it('handles missing metadata gracefully', () => {
    const json = JSON.stringify({
      cards: [{ front: 'Q', back: 'A' }],
    });

    const { flashcards: result } = service.parseFlashcardResponse(json, 'test', 'text');
    expect(result.title).toBe('Flashcard Set');
    expect(result.metadata.difficulty).toBe('intermediate');
    expect(result.metadata.estimatedTime).toBe(10);
    expect(result.cards[0].id).toBeTruthy();
  });

  it('does NOT crash when "content" field is a string (not an array)', () => {
    // The AI sometimes returns a "content" field as a string alongside cards
    const json = JSON.stringify({
      title: 'Test',
      content: 'This is the raw content string',
      cards: [{ front: 'Q', back: 'A' }],
    });

    const { flashcards: result } = service.parseFlashcardResponse(json, 'test', 'text');
    expect(result.cards).toHaveLength(1);
  });

  it('generates unique IDs for cards without them', () => {
    const json = JSON.stringify({
      cards: [
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' },
      ],
    });

    const { flashcards: result } = service.parseFlashcardResponse(json, 'test', 'text');
    expect(result.cards[0].id).toBeTruthy();
    expect(result.cards[1].id).toBeTruthy();
    expect(result.cards[0].id).not.toBe(result.cards[1].id);
    expect(result.id).toBeTruthy();
  });
});

describe('parseAudioScriptResponse', () => {
  it('handles standard "sections" key', () => {
    const json = JSON.stringify({
      title: 'Stoicism Audio',
      sections: [
        { heading: 'Introduction', content: 'Welcome to this lesson on Stoicism.' },
        { heading: 'Core Ideas', content: 'The Stoics believed in living virtuously.' },
      ],
      metadata: { estimatedDuration: 300 }
    });

    const result = service.parseAudioScriptResponse(json);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].heading).toBe('Introduction');
    expect(result.title).toBe('Stoicism Audio');
  });

  it('handles "segments" key instead of "sections"', () => {
    const json = JSON.stringify({
      title: 'Lesson',
      segments: [
        { title: 'Part 1', text: 'First part of the lesson.' },
      ],
    });

    const result = service.parseAudioScriptResponse(json);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].heading).toBe('Part 1');
    expect(result.sections[0].content).toBe('First part of the lesson.');
  });

  it('handles "parts" key', () => {
    const json = JSON.stringify({
      title: 'Lesson',
      parts: [
        { header: 'Opening', body: 'Let us begin.' },
      ],
    });

    const result = service.parseAudioScriptResponse(json);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].heading).toBe('Opening');
    expect(result.sections[0].content).toBe('Let us begin.');
  });

  it('handles flat "content" string (no sections array)', () => {
    const json = JSON.stringify({
      title: 'Simple Lesson',
      content: 'This is the entire audio script as a single string. It covers all the material.',
    });

    const result = service.parseAudioScriptResponse(json);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].content).toContain('entire audio script');
  });

  it('does NOT crash when content is a string AND no sections exist', () => {
    // This is the specific bug: raw.content is a truthy string,
    // so `raw.sections || raw.content || []` resolves to the string,
    // and .map() on a string throws.
    const json = JSON.stringify({
      title: 'Flat Content',
      content: 'Just a flat string, no sections array at all.',
    });

    // Should NOT throw
    const result = service.parseAudioScriptResponse(json);
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.content).toContain('flat string');
  });

  it('throws clear error when no content at all', () => {
    const json = JSON.stringify({ title: 'Empty' });
    expect(() => service.parseAudioScriptResponse(json))
      .toThrow('AI returned no audio script content');
  });

  it('handles missing metadata gracefully', () => {
    const json = JSON.stringify({
      sections: [{ heading: 'Intro', content: 'Hello.' }],
    });

    const result = service.parseAudioScriptResponse(json);
    expect(result.title).toBe('Audio Lesson');
    expect(result.metadata.estimatedDuration).toBe(300);
  });
});

describe('extractTechnicalFlag', () => {
  it('detects [technical] keyword', () => {
    const r = extractTechnicalFlag('[technical] explain idempotency keys');
    expect(r.technicalDepth).toBe(true);
    expect(r.content).toBe('explain idempotency keys');
  });

  it('detects [tech] short form', () => {
    const r = extractTechnicalFlag('[tech] WebSocket subprotocols');
    expect(r.technicalDepth).toBe(true);
    expect(r.content).toBe('WebSocket subprotocols');
  });

  it('detects --technical flag', () => {
    const r = extractTechnicalFlag('explain --technical caching strategies');
    expect(r.technicalDepth).toBe(true);
    expect(r.content).toBe('explain caching strategies');
  });

  it('matches case-insensitively', () => {
    const r = extractTechnicalFlag('[Technical] something');
    expect(r.technicalDepth).toBe(true);
    expect(r.content).toBe('something');
  });

  it('returns false on plain input', () => {
    const r = extractTechnicalFlag('explain WebSocket subprotocols');
    expect(r.technicalDepth).toBe(false);
    expect(r.content).toBe('explain WebSocket subprotocols');
  });

  it('returns false when [technical] is mid-word (not a real flag)', () => {
    // This is content that happens to contain the substring but isn't
    // the flag — flag must be space- or boundary-delimited.
    const r = extractTechnicalFlag('the\\[technical]\\citation says X');
    expect(r.technicalDepth).toBe(false);
  });

  it('strips multiple occurrences', () => {
    const r = extractTechnicalFlag('[tech] foo [technical] bar');
    expect(r.technicalDepth).toBe(true);
    expect(r.content).toBe('foo bar');
  });

  it('handles empty input', () => {
    const r = extractTechnicalFlag('');
    expect(r.technicalDepth).toBe(false);
    expect(r.content).toBe('');
  });
});

describe('renderTechnicalDepthBlock', () => {
  it('returns empty string when off (preserves bit-for-bit existing prompts)', () => {
    expect(renderTechnicalDepthBlock(false)).toBe('');
  });

  it('returns a <technical_depth> block with the depth instructions when on', () => {
    const block = renderTechnicalDepthBlock(true);
    expect(block).toContain('<technical_depth>');
    expect(block).toContain('</technical_depth>');
    expect(block).toContain('working software practitioner');
    expect(block).toContain('mechanism');
    expect(block).toContain('tradeoffs');
  });
});

describe('getAudioScriptPrompt with technical depth', () => {
  it('omits the depth block by default', () => {
    const p = service.getAudioScriptPrompt('Some content', null);
    expect(p).not.toContain('<technical_depth>');
  });

  it('includes the depth block when options.technicalDepth is true', () => {
    const p = service.getAudioScriptPrompt('Some content', null, { technicalDepth: true });
    expect(p).toContain('<technical_depth>');
    expect(p).toContain('working software practitioner');
  });
});

describe('getFlashcardPrompt with technical depth', () => {
  it('omits the depth block by default', () => {
    const p = service.getFlashcardPrompt('Some content', 'text');
    expect(p).not.toContain('<technical_depth>');
  });

  it('includes the depth block when options.technicalDepth is true', () => {
    const p = service.getFlashcardPrompt('Some content', 'text', undefined, null, { technicalDepth: true });
    expect(p).toContain('<technical_depth>');
    expect(p).toContain('mechanism');
  });
});
