import type { AudioBriefing } from './types';
import type { Flashcard } from './services/aiPrompting';

/**
 * Dev-only fixture used by `?demo=audio` to verify the AudioPlayer's
 * Pause-and-Quiz UX without spending LLM/TTS credits or running the API
 * locally. Loaded only when `import.meta.env.DEV` is true (the App-level
 * gate makes this dead-code in production builds).
 */
export const DEMO_FLASHCARDS: Flashcard[] = [
  {
    id: 'demo-card-factory',
    front: 'How does photosynthesis turn sunlight into food?',
    back: 'Plants capture light energy with chlorophyll and use it to combine CO₂ and water into glucose, releasing oxygen as a byproduct.',
    explanation:
      'Think of a plant as a solar-powered factory. Sunlight is the electricity bill (the sun never invoices). CO₂ walks in the front door, water comes up from the basement, and glucose rolls off the assembly line.',
    difficulty: 'easy',
    tags: ['biology'],
  },
  {
    id: 'demo-card-oxygen',
    front: 'What does photosynthesis release as a byproduct?',
    back: 'Oxygen. Plants exhale it as a waste product of splitting water during the light reactions.',
    explanation:
      "Every breath you take was once exhaled by a plant. The factory's exhaust vent is the entire planet's atmosphere — and we evolved to breathe their waste.",
    difficulty: 'easy',
    tags: ['biology'],
  },
];

export const DEMO_PAUSE_AND_QUIZ_BRIEFING: AudioBriefing = {
  briefing_id: 'demo-deck',
  title: 'Photosynthesis (demo)',
  source: '',
  created_at: new Date().toISOString(),
  audio_file: undefined,
  script: [
    "Imagine you're standing in a kitchen at 7am. Sunlight pours through the window onto a cup of coffee. That sunlight isn't doing nothing — it's hitting things, and where it hits a plant, something extraordinary happens. The plant is running a factory.",
    "Here's the trick: plants are solar-powered factories. Sunlight is their electricity bill, except the sun sends them no invoice. They pull carbon dioxide in through tiny pores in their leaves — billions of them, like microscopic mouths. They drink water from the soil. And from those two ingredients plus sunlight, they manufacture sugar.",
    "But unlike any factory you've ever seen, this one breathes out something we need to live. Oxygen. Every breath you take — every single one — was once exhaled by a plant. The factory you started picturing in your kitchen is the same one that filled the planet's atmosphere over billions of years.",
  ].join('\n\n'),
  sections: [
    {
      id: 'demo-section-1',
      content: "Imagine you're standing in a kitchen at 7am. Sunlight pours through the window onto a cup of coffee. That sunlight isn't doing nothing — it's hitting things, and where it hits a plant, something extraordinary happens. The plant is running a factory.",
    },
    {
      id: 'demo-section-2',
      content: "Here's the trick: plants are solar-powered factories. Sunlight is their electricity bill, except the sun sends them no invoice. They pull carbon dioxide in through tiny pores in their leaves — billions of them, like microscopic mouths. They drink water from the soil. And from those two ingredients plus sunlight, they manufacture sugar.",
    },
    {
      id: 'demo-section-3',
      content: "But unlike any factory you've ever seen, this one breathes out something we need to live. Oxygen. Every breath you take — every single one — was once exhaled by a plant. The factory you started picturing in your kitchen is the same one that filled the planet's atmosphere over billions of years.",
    },
  ],
  interruptionPoints: [
    { afterSectionIndex: 1, cardId: 'demo-card-factory' },
    { afterSectionIndex: 2, cardId: 'demo-card-oxygen' },
  ],
};
