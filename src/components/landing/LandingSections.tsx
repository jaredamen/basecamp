import { useState } from 'react';
import { motion } from 'framer-motion';
import { Headphones, Brain, Sparkles, Check, ChevronDown } from 'lucide-react';
import { signInWithGoogle } from '../../services/managedAuth';
import { DemoStrip } from './DemoStrip';
import { ExtensionHype } from './ExtensionHype';

/**
 * Below-the-fold landing-page content for unauthenticated visitors.
 * Sits beneath the orb + SignInBand hero. Marc Lou-style: how-it-works,
 * pain/solution, pricing, FAQ, final CTA.
 *
 * The orb is the brand — it stays the visible centerpiece above. Anything
 * here is depth for visitors who scroll, never required to sign up.
 */
export function LandingSections() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-24 pt-16 sm:pt-24 space-y-24 sm:space-y-32">
      <ScrollHint />
      <DemoStrip />
      <HowItWorks />
      <WhyItExists />
      <ExtensionHype />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function ScrollHint() {
  return (
    <div className="flex justify-center -mt-4 sm:-mt-8">
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-solar-500 text-xs font-mono uppercase tracking-wider flex flex-col items-center gap-1"
      >
        <span>see it in action</span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Sparkles,
      title: 'Paste any topic',
      body: 'A URL, a Wikipedia subject, or your own paragraph of notes. Basecamp pulls the source and figures out what matters.',
    },
    {
      icon: Headphones,
      title: 'Listen to your briefing',
      body: 'A voice walks you through it like a domain expert who already knows what you know — analogies tailored to your background.',
    },
    {
      icon: Brain,
      title: 'Get quizzed mid-listen',
      body: 'The audio pauses every couple of minutes for an active-recall checkpoint. Type or pick — basecamp grades, then resumes.',
    },
  ];
  return (
    <section>
      <SectionHeader
        eyebrow="how it works"
        title="From topic to retention in three minutes."
      />
      <div className="grid sm:grid-cols-3 gap-4 mt-10">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="glass rounded-2xl p-6 space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-solar-gold/15 border border-solar-gold/40 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-solar-gold" />
            </div>
            <div className="text-xs text-solar-500 font-mono uppercase tracking-wider">
              step {i + 1}
            </div>
            <h3 className="text-lg font-semibold text-solar-100">{s.title}</h3>
            <p className="text-sm text-solar-400 leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function WhyItExists() {
  return (
    <section>
      <SectionHeader
        eyebrow="why basecamp"
        title="The way you've been learning is broken."
      />
      <div className="grid md:grid-cols-2 gap-6 mt-10">
        <div className="glass rounded-2xl p-6 space-y-3">
          <div className="text-xs text-solar-ember font-mono uppercase tracking-wider">the problem</div>
          <ul className="space-y-2.5 text-sm text-solar-400 leading-relaxed">
            <li>• You read articles and forget them by Friday.</li>
            <li>• Flashcards feel like homework with no momentum.</li>
            <li>• AI summaries strip out the texture that makes ideas stick.</li>
            <li>• Audio podcasts let your mind wander — no checkpoints.</li>
          </ul>
        </div>
        <div className="glass rounded-2xl p-6 space-y-3 border-solar-gold/40">
          <div className="text-xs text-solar-gold font-mono uppercase tracking-wider">basecamp instead</div>
          <ul className="space-y-2.5 text-sm text-solar-100 leading-relaxed">
            <li>✓ Audio with mid-listen checkpoints — passive becomes active.</li>
            <li>✓ Analogies built from things you already know.</li>
            <li>✓ "Deeper Look" section nails facts, names, dates.</li>
            <li>✓ Zero homework feel — sounds like a friend explaining.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: '',
      tagline: 'Try it, then pay only for what you use',
      features: [
        '~5 briefings included free',
        'No card required to start',
        'Add a card to keep going at ~$0.10 per briefing',
        'No subscription, no auto-charge',
      ],
      cta: 'Start free',
      highlight: false,
    },
    {
      name: 'Lifetime',
      price: '$29',
      period: 'once',
      tagline: 'Launch promo · 30 days',
      features: [
        'Unlimited briefings',
        'Priority TTS quality',
        'Personal library + analytics',
        'Browser extension (coming soon)',
      ],
      cta: 'Get lifetime',
      highlight: true,
      badge: 'BEST VALUE',
    },
    {
      name: 'Monthly',
      price: '$9',
      period: '/ month',
      tagline: 'Or pay as you go',
      features: [
        'Unlimited briefings',
        'Priority TTS quality',
        'Personal library + analytics',
        'Cancel anytime',
      ],
      cta: 'Go monthly',
      highlight: false,
    },
  ];
  return (
    <section>
      <SectionHeader
        eyebrow="pricing"
        title="Free to start. Cheap to go pro."
      />
      <p className="text-center text-solar-400 text-sm mt-3 max-w-xl mx-auto">
        Lifetime is a launch-week price. After the 30-day promo it goes away.
      </p>
      <div className="grid md:grid-cols-3 gap-4 mt-10">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`glass rounded-2xl p-6 flex flex-col gap-4 relative ${
              t.highlight ? 'border-solar-gold/60 ring-1 ring-solar-gold/40' : ''
            }`}
          >
            {t.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-solar-gold text-solar-900 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                {t.badge}
              </div>
            )}
            <div>
              <div className="text-xs text-solar-500 font-mono uppercase tracking-wider">
                {t.name}
              </div>
              <div className="mt-1 text-xs text-solar-400">{t.tagline}</div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-solar-100">{t.price}</span>
              {t.period && <span className="text-sm text-solar-500">{t.period}</span>}
            </div>
            <ul className="space-y-2 flex-1">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-solar-100/85">
                  <Check className="w-4 h-4 text-solar-gold flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={signInWithGoogle}
              className={`w-full py-2.5 rounded-xl font-medium transition-colors ${
                t.highlight
                  ? 'bg-solar-gold hover:bg-solar-amber text-solar-900'
                  : 'bg-solar-700 hover:bg-solar-600 text-solar-100'
              }`}
            >
              {t.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: 'Do I need to install anything?',
    a: 'No. It runs in your browser. There\'s also a Chrome extension if you want to send articles in with one click.',
  },
  {
    q: 'How is this different from ChatGPT or NotebookLM?',
    a: 'Audio is the driver, not a side feature — and the audio pauses for active-recall checkpoints, so you don\'t passively zone out. The analogies are also tailored to what you already know, not generic.',
  },
  {
    q: 'What sources can I paste in?',
    a: 'Article URLs, Wikipedia topics, or your own typed notes. If a page is paywalled or JS-heavy, paste the text directly.',
  },
  {
    q: 'How does the free tier work?',
    a: 'Every new account gets $0.50 in credit (about 5 briefings). When that runs out, top up with a tier above — no auto-charge.',
  },
  {
    q: 'Is my content private?',
    a: 'Yes. We don\'t train models on your content and we don\'t share it. Briefings are stored only for your account.',
  },
  {
    q: 'Can I cancel?',
    a: 'Anytime, one click. Lifetime is a one-time payment with no recurring charge. Monthly cancels at the end of the period.',
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section>
      <SectionHeader eyebrow="faq" title="Quick answers." />
      <div className="mt-10 space-y-2 max-w-3xl mx-auto">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="glass rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-solar-gold/5 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="text-solar-100 font-medium text-sm sm:text-base">{f.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-solar-gold flex-shrink-0 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-sm text-solar-400 leading-relaxed">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="text-center space-y-5 py-8">
      <h2 className="text-2xl sm:text-3xl font-semibold text-solar-100 leading-tight">
        Stop forgetting what you read.
      </h2>
      <p className="text-solar-400 max-w-xl mx-auto text-sm sm:text-base">
        First briefing takes 30 seconds. Free to try, no credit card.
      </p>
      <div className="flex justify-center">
        <motion.button
          onClick={signInWithGoogle}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="glass rounded-full px-6 py-3 flex items-center gap-3 text-solar-100 hover:border-solar-gold/40 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="font-medium">Continue with Google</span>
        </motion.button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-solar-gold/15 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-solar-500 font-mono">
      <div>© basecamp · {new Date().getFullYear()}</div>
      <div className="flex gap-4">
        <a href="mailto:hello@basecamp.app" className="hover:text-solar-gold transition-colors">contact</a>
        <a href="/privacy" className="hover:text-solar-gold transition-colors">privacy</a>
        <a href="/terms" className="hover:text-solar-gold transition-colors">terms</a>
      </div>
    </footer>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center space-y-2 max-w-2xl mx-auto">
      <div className="text-xs text-solar-gold font-mono uppercase tracking-wider">{eyebrow}</div>
      <h2 className="text-2xl sm:text-3xl font-semibold text-solar-100 leading-tight">{title}</h2>
    </div>
  );
}
