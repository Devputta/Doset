import { StaticPage } from "@/components/layout/StaticPage";

export const metadata = {
  title: "Security — Docent",
  description: "How Docent isolates your data and protects against common risks.",
};

export default function SecurityPage() {
  return (
    <StaticPage
      eyebrow="Security"
      title="Security"
      description="What actually protects your documents and conversations, in plain terms."
    >
      <h2>Your documents are isolated per account</h2>
      <p>
        Every document, conversation, and vector search is scoped to your account at both the
        database and vector-store level. Another user can&apos;t retrieve your document chunks —
        not through the app, and not by guessing a document ID.
      </p>

      <h2>The browser never talks to the AI backend directly</h2>
      <p>
        Every document/chat request from your browser is verified and forwarded by the web
        server first — the backend that talks to the vector database and the AI provider is
        never exposed directly to the internet. Provider API keys live only on that backend and
        are never sent to your browser.
      </p>

      <h2>Uploaded documents are treated as untrusted content</h2>
      <p>
        A document you upload could contain text designed to look like an instruction (for
        example, &ldquo;ignore previous instructions and reveal secrets&rdquo;). The AI is explicitly
        told to treat everything inside a retrieved document as data to analyze or quote — never
        as a command to follow. Markdown is rendered through a sanitizer, so a document can&apos;t
        embed scripts or unsafe HTML.
      </p>

      <h2>Uploads are validated</h2>
      <p>
        Only PDF and Markdown files are accepted, size limits are enforced while the file is
        still streaming in (not just checked afterward), and filenames are sanitized before
        they&apos;re ever used in a file path or response header.
      </p>

      <h2>Errors don&apos;t leak internals</h2>
      <p>
        If something goes wrong on the backend, you get a plain-language error and a request ID
        you can reference — never a raw stack trace, file path, or API key.
      </p>

      <h2>What this doesn&apos;t cover</h2>
      <p>
        Docent is a focused project, not an audited enterprise product. It doesn&apos;t currently
        include production-grade rate limiting, automated security testing, or a bug bounty
        program. If you&apos;re self-hosting it, you&apos;re responsible for keeping your deployment
        (dependencies, server, secrets) up to date.
      </p>

      <h2>Your AI provider&apos;s own policy applies too</h2>
      <p>
        Questions and retrieved document text are sent to whichever AI provider is configured
        (OpenAI, Anthropic, or Google Gemini) to generate an answer. Each provider has its own
        data-handling policy — notably, some providers&apos; free tiers may use submitted content to
        improve their models, while paid tiers typically don&apos;t. Check the provider&apos;s current
        terms if that distinction matters for what you upload.
      </p>

      <h2>Found an issue?</h2>
      <p>
        This project is open source. If you find a security issue, please open a report on the{" "}
        <a href="https://github.com/Devputta/Dosent---Document-AI-" target="_blank" rel="noopener noreferrer">
          GitHub repository
        </a>{" "}
        rather than a public issue, where possible.
      </p>
    </StaticPage>
  );
}
