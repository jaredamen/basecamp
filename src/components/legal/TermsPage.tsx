import { LegalPage } from './LegalPage';

export function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="May 2026">
      <Section title="The deal">
        <p>
          basecamp is a service that turns sources you submit into audio briefings with active-recall checkpoints. By using the service you agree to these terms. If you don't agree, don't use the service.
        </p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>You sign in with Google. You're responsible for keeping your Google account secure — basecamp itself doesn't hold a separate password.</li>
          <li>You must be at least 13 years old (or the minimum age for online services in your jurisdiction).</li>
          <li>One account per person. Don't share access with others.</li>
        </ul>
      </Section>

      <Section title="What you can submit">
        <ul>
          <li>You may submit URLs, topic names, or text you have the right to use.</li>
          <li>Don't submit content that's illegal, infringes others' copyrights, contains malware, or attempts to compromise the service.</li>
          <li>Don't try to extract or override the LLM's system prompts, exfiltrate other users' data, or abuse the credit system.</li>
        </ul>
      </Section>

      <Section title="Free tier and pricing">
        <ul>
          <li>New accounts get a small amount of free credit (about 5 briefings) at no cost. No card required.</li>
          <li>Once you've used the free credit, you may add a payment method to keep going. Charges are usage-based — no subscription, no auto-renewal.</li>
          <li>Lifetime and monthly plans are optional. The lifetime price is a one-time charge for unlimited use; cancellation isn't applicable to lifetime.</li>
          <li>Monthly plans renew on a monthly basis until you cancel. You can cancel any time; cancellation takes effect at the end of the current billing period.</li>
          <li>Promotional pricing (e.g., the launch lifetime price) is offered for a limited window stated on the pricing page. After the window closes the regular pricing applies to new purchases.</li>
        </ul>
      </Section>

      <Section title="Refunds">
        <p>
          We're a small team. If you're unhappy with a purchase, email us at <a className="text-solar-gold underline" href="mailto:hello@basecamp.app">hello@basecamp.app</a> within 14 days of purchase and we'll refund you in full, no questions asked, as long as the account hasn't been used for an unreasonable volume of generations.
        </p>
      </Section>

      <Section title="Service availability">
        <p>
          We try to keep the service running, but we don't guarantee 100% uptime. Maintenance, third-party outages (OpenAI, Stripe, Vercel, Neon), and other factors can cause downtime. We'll do what we can to keep you informed.
        </p>
      </Section>

      <Section title="Generated content">
        <ul>
          <li>The audio briefings, flashcards, and other generated outputs you produce are yours to use for personal study or work.</li>
          <li>Generated content can be wrong. We use LLMs to summarize and explain — they hallucinate. Verify anything important against the source.</li>
          <li>We don't take responsibility for decisions you make based on generated briefings.</li>
        </ul>
      </Section>

      <Section title="Termination">
        <p>
          We can suspend or terminate your account if you violate these terms (e.g., abuse, attempted exploits, malicious content). You can delete your account at any time by emailing us.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms. Material changes will be reflected in the "last updated" date and surfaced in the app. Continued use after a change means you accept the updated terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions: <a className="text-solar-gold underline" href="mailto:hello@basecamp.app">hello@basecamp.app</a>.
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
