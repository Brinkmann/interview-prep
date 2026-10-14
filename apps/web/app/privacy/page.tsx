import { NOTICE_VERSION } from "@/lib/privacy";

// LR-01: just-in-time notice at upload. Proof-of-concept text (D-26), approved by the
// founder on 14 October 2026; a privacy lawyer reviews it before any public launch.
export default function Privacy() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 680, margin: "3rem auto", padding: "0 1rem", lineHeight: 1.5 }}>
      <h1>How we handle your information</h1>
      <p><em>Version {NOTICE_VERSION}. This is a test version of the service, used by invited testers only.</em></p>

      <h2>What we collect and why</h2>
      <p>You give us a job ad, your CV and your answers to our questions. We use them for one purpose: to show you how well your evidence matches the role and help you prepare for the interview. We never sell or share your information, use it for marketing, or let anyone train AI models on it.</p>

      <h2>What we remove straight away</h2>
      <p>Before we keep anything, we remove details an employer must not use to judge you: your photo, date of birth, age, gender, marital status, nationality, and statements about your health, ethnicity or religion. We delete your original file as soon as we have read it.</p>
      <p>We hold the removed lines, encrypted, for 24 hours so you can put back anything removed by mistake. After 24 hours they are deleted. We never keep your photo.</p>

      <h2>Where it is kept and who can see it</h2>
      <p>Your information is stored in Sydney, Australia, and only you can see it. Our staff do not look at it. These services process it for us:</p>
      <ul>
        <li><strong>Supabase</strong> (database and file storage, Sydney): stores your information.</li>
        <li><strong>Vercel</strong> (website hosting, Sydney): runs the website.</li>
        <li><strong>Anthropic</strong> (AI provider, United States): reads the text you give us to analyse it. It does not use your information to train its models.</li>
        <li><strong>Inngest</strong> (background tasks): receives only reference numbers, never your content.</li>
        <li><strong>Sentry</strong> (error reports): receives technical error details only, never your content.</li>
        <li><strong>Google</strong>: only if you choose to sign in with Google.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>We delete everything 90 days after you sign up, unless you delete it sooner. You can delete all your information at any time with one button on your page, and it is gone within minutes.</p>

      <h2>Your rights</h2>
      <p>You can see, correct and delete your information at any time. To ask for a copy of everything we hold about you, or with any question, contact [contact email].</p>
    </main>
  );
}
