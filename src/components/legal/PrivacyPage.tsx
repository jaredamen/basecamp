import { LegalPage } from './LegalPage';

export function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="May 2026">
      <Section title="Who we are">
        <p>
          basecamp ("we", "us") is a web application that turns sources you paste — URLs, topics, or text — into audio briefings with active-recall checkpoints. This policy explains what data we collect when you use the service and how we handle it.
        </p>
      </Section>

      <Section title="What we collect">
        <ul>
          <li><strong>Account data.</strong> When you sign in with Google, we store your name, email, and Google account ID so you can sign in again later. We don't ask for or store your Google password.</li>
          <li><strong>Profile preferences.</strong> The optional onboarding answers you provide (your name, the domains you know well) live in your browser's localStorage. They're sent to our servers only as part of LLM prompts so analogies can bridge to what you already know — they're never persisted on our side beyond the duration of a single API call.</li>
          <li><strong>Content you submit.</strong> The URLs, topics, and text you paste are sent to our LLM provider (OpenAI) to generate briefings. Generated briefings are stored against your account so you can revisit them. Source URLs and pasted text are stored only inasmuch as they're embedded in the generated briefing.</li>
          <li><strong>Billing data.</strong> If you add a payment method, Stripe processes and stores your card. We see only the last 4 digits and a Stripe customer ID. We never see the full card number.</li>
          <li><strong>Usage data.</strong> Standard server logs (IP address, user agent, requested endpoint, timestamp) for security and debugging. We don't run third-party analytics or advertising trackers.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To run the service: create your account, generate briefings you ask for, store your library, charge you only when you've authorized it.</li>
          <li>To debug and prevent abuse: server logs help us find bugs and detect abuse of LLM credits.</li>
          <li>We do <strong>not</strong> sell your data, share it with advertisers, or use your content to train models.</li>
        </ul>
      </Section>

      <Section title="Third parties">
        <ul>
          <li><strong>OpenAI</strong> — processes the prompts we send to generate briefings and audio. Subject to OpenAI's API data policy: API content is not used to train OpenAI's models.</li>
          <li><strong>Google</strong> — handles the sign-in OAuth flow.</li>
          <li><strong>Stripe</strong> — handles payment processing.</li>
          <li><strong>Vercel</strong> — hosts the application.</li>
          <li><strong>Neon</strong> — hosts the database where we store your account + briefings.</li>
        </ul>
      </Section>

      <Section title="Your rights">
        <ul>
          <li>You can sign out at any time. Signing out clears your session cookie and your local profile preferences.</li>
          <li>You can email us at <a className="text-solar-gold underline" href="mailto:hello@basecamp.app">hello@basecamp.app</a> to request a copy of your data, deletion of your account, or any correction. We'll respond within a reasonable time.</li>
          <li>If you're in the EU/UK, GDPR rights (access, rectification, erasure, portability, objection) apply — same channel.</li>
        </ul>
      </Section>

      <Section title="Cookies">
        <p>
          We use a single HttpOnly session cookie to keep you signed in. We don't use tracking cookies, advertising pixels, or third-party analytics cookies.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If we change anything material, we'll bump the "last updated" date above and surface a notice in the app. Continued use after a change means you accept the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or requests: <a className="text-solar-gold underline" href="mailto:hello@basecamp.app">hello@basecamp.app</a>.
        </p>
      </Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-solar-100">{title}</h2>
      <div className="space-y-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-solar-gold [&_a]:underline [&_strong]:text-solar-100">
        {children}
      </div>
    </section>
  );
}
