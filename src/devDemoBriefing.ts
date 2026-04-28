import type { AudioBriefing } from './types';

/**
 * Dev-only fixture used by `?demo=audio` to verify the AudioPlayer's
 * Pause-and-Quiz UX without spending LLM/TTS credits or running the API
 * locally. Loaded only when `import.meta.env.DEV` is true (the App-level
 * gate makes this dead-code in production builds).
 */
export const DEMO_PAUSE_AND_QUIZ_BRIEFING: AudioBriefing = {
  briefing_id: 'demo-pause-and-quiz',
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
  quizzes: [
    {
      id: 'demo-quiz-1',
      afterSectionIndex: 0,
      question: 'What does the lesson compare a plant to?',
      choices: ['A solar panel', 'A factory', 'A kitchen', 'A river'],
      correctIndex: 1,
      explanation: 'The kitchen scene was the setup — but the plant itself is framed as a factory running on sunlight.',
    },
    {
      id: 'demo-quiz-2',
      afterSectionIndex: 2,
      question: 'What does photosynthesis release as a byproduct?',
      choices: ['Carbon dioxide', 'Sugar', 'Oxygen', 'Heat'],
      correctIndex: 2,
      explanation: 'Plants exhale oxygen — every breath you take was once exhaled by one.',
    },
  ],
};
