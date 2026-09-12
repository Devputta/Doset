import { StaticPage } from "@/components/layout/StaticPage";

export const metadata = {
  title: "Privacy — Docent",
  description: "What data Docent stores and where it goes.",
};

export default function PrivacyPage() {
  return (
    <StaticPage
      eyebrow="Privacy"
      title="Privacy"
      description="A plain-language summary of what's stored and where it goes. This isn't a legal document — if you're deploying Docent for real users, replace this page with an actual privacy policy for your deployment."
    >
      <h2>What&apos;s stored</h2>
      <ul>
        <li>Your account: username, email, and a hashed password (or your Google account ID, if you sign in with Google)</li>
        <li>The original files you upload, plus the text chunks and embeddings generated from them</li>
        <li>Your conversations: every question and answer, tied to the document they&apos;re about</li>
      </ul>
      <p>Nothing here is sold, and there are no third-party advertising trackers in the app.</p>

      <h2>Where it&apos;s stored</h2>
      <p>
        Everything above lives on whichever server is running this deployment — there&apos;s no
        separate cloud service collecting your data beyond that. If you&apos;re running this
        yourself (see the project&apos;s README), it never leaves your own infrastructure except
        for the specific calls described below.
      </p>

      <h2>What leaves the server</h2>
      <p>
        To answer a question, the relevant excerpts from your document and your question text
        are sent to whichever AI provider is configured (OpenAI, Anthropic, or Google Gemini) to
        generate a response and to create embeddings. That provider&apos;s own privacy policy
        governs what happens to that data on their end — see the{" "}
        <a href="/security">Security page</a> for a note on free-tier vs. paid-tier handling.
      </p>

      <h2>Deleting your data</h2>
      <p>
        Deleting a document removes the original file, its extracted text, its embeddings, and
        any conversations tied to it. Deleting your account (not yet available as a
        self-service action) can be requested from whoever operates your specific deployment.
      </p>
    </StaticPage>
  );
}
