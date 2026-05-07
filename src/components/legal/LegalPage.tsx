import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

/**
 * Shared layout for the privacy + terms pages. Same Eigengrau backdrop
 * as the rest of the app, scaled-down chrome (no orb, no sign-in CTA),
 * single back link to `/`.
 */
export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-solar-900 text-solar-100">
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs text-solar-gold hover:text-solar-amber font-mono uppercase tracking-wider mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          back to basecamp
        </a>

        <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">{title}</h1>
        <p className="mt-2 text-xs text-solar-500 font-mono uppercase tracking-wider">
          last updated {lastUpdated}
        </p>

        <div className="mt-10 prose-legal space-y-6 text-solar-100/85 leading-relaxed text-sm sm:text-base">
          {children}
        </div>
      </div>
    </main>
  );
}
