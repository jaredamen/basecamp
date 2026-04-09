import { useState, useEffect } from 'react';

interface WelcomeProps {
  onGetStarted: () => void;
  onShowDemo: () => void;
  onSkipToApp: () => void;
}

const FEATURE_HIGHLIGHTS = [
  {
    icon: '🧠',
    title: 'Smart Flashcards',
    description: 'AI-generated cards from any content'
  },
  {
    icon: '🗣️',
    title: 'Fun Voices',
    description: 'Peter Griffin, motivational coaches & more!'
  },
  {
    icon: '📱',
    title: 'Study Anywhere',
    description: 'Mobile-first design for on-the-go learning'
  },
  {
    icon: '🏆',
    title: 'Track Progress',
    description: 'Achievements and streaks to keep you motivated'
  }
];

const TESTIMONIALS = [
  {
    text: "Finally, studying doesn't feel like work!",
    voice: "Peter Griffin voice user"
  },
  {
    text: "I actually look forward to my study sessions now.",
    voice: "Daily streak champion"
  },
  {
    text: "Perfect for busy schedules - quick 10-minute sessions work!",
    voice: "Working professional"
  }
];

export function Welcome({ onGetStarted, onShowDemo, onSkipToApp }: WelcomeProps) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-md mx-auto text-center space-y-8">
          {/* Logo/Brand */}
          <div className="space-y-4">
            <div className="text-6xl">📚</div>
            <h1 className="text-4xl font-bold text-white">
              Basecamp
            </h1>
            <p className="text-xl text-blue-300">
              Your AI Learning Companion
            </p>
          </div>

          {/* Value Proposition */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-dark-100">
              Turn any topic into fun, bite-sized learning
            </h2>
            <p className="text-lg text-dark-300">
              Traditional flashcards are boring. Basecamp makes studying 
              <span className="text-blue-400 font-semibold"> actually enjoyable</span> with 
              AI-powered content and hilarious voices.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4">
            {FEATURE_HIGHLIGHTS.map((feature, index) => (
              <div 
                key={index}
                className="bg-dark-800/50 backdrop-blur-sm rounded-lg p-4 border border-dark-700"
              >
                <div className="text-2xl mb-2">{feature.icon}</div>
                <div className="text-sm font-semibold text-dark-100">{feature.title}</div>
                <div className="text-xs text-dark-400 mt-1">{feature.description}</div>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700">
            <div className="text-yellow-400 text-lg mb-2">⭐⭐⭐⭐⭐</div>
            <blockquote className="text-dark-200 italic">
              "{TESTIMONIALS[currentTestimonial].text}"
            </blockquote>
            <div className="text-xs text-dark-500 mt-2">
              — {TESTIMONIALS[currentTestimonial].voice}
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-4">
            <button
              onClick={onGetStarted}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 
                       rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 
                       transition-all transform hover:scale-105 shadow-lg"
            >
              Get Started - It's Free! 🚀
            </button>

            <div className="flex gap-3">
              <button
                onClick={onShowDemo}
                className="flex-1 bg-dark-800 text-dark-200 py-3 px-4 rounded-lg 
                         hover:bg-dark-700 transition-colors border border-dark-600"
              >
                See Demo
              </button>
              
              <button
                onClick={onSkipToApp}
                className="flex-1 text-dark-400 py-3 px-4 rounded-lg 
                         hover:text-dark-300 hover:bg-dark-800 transition-all"
              >
                Skip to App
              </button>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="flex justify-center items-center gap-4 text-dark-500 text-sm">
            <div className="flex items-center gap-1">
              <span>🔒</span>
              <span>Privacy First</span>
            </div>
            <div>•</div>
            <div className="flex items-center gap-1">
              <span>📱</span>
              <span>Works Offline</span>
            </div>
            <div>•</div>
            <div className="flex items-center gap-1">
              <span>⚡</span>
              <span>No Ads</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave Design */}
      <div className="relative">
        <svg 
          viewBox="0 0 1200 120" 
          className="w-full h-20 text-blue-600/20"
          preserveAspectRatio="none"
        >
          <path 
            fill="currentColor" 
            d="M0,0 C150,40 350,40 500,20 C650,0 850,0 1000,20 C1100,35 1150,40 1200,40 L1200,120 L0,120 Z"
          />
        </svg>
      </div>
    </div>
  );
}

// Alternative compact version for returning users
export function WelcomeQuick({ onGetStarted, onSkipToApp }: Omit<WelcomeProps, 'onShowDemo'>) {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col justify-center px-6">
      <div className="max-w-sm mx-auto text-center space-y-6">
        <div className="text-4xl">📚</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Welcome back to Basecamp!</h1>
          <p className="text-dark-300">Ready to continue your learning journey?</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onGetStarted}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold
                     hover:bg-blue-700 transition-colors"
          >
            Let's Study! 🎯
          </button>
          
          <button
            onClick={onSkipToApp}
            className="w-full text-dark-400 py-2 px-4 rounded-lg 
                     hover:text-dark-300 hover:bg-dark-800 transition-all"
          >
            Skip to app
          </button>
        </div>
      </div>
    </div>
  );
}