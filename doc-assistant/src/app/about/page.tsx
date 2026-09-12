import { StaticPage } from "@/components/layout/StaticPage";
import { Button } from "@/components/ui/Button";
import { GithubIcon } from "@/components/icons/GithubIcon";

export const metadata = {
  title: "About — Docent",
  description: "What Docent is, why it exists, and how it's built.",
};

export default function AboutPage() {
  return (
    <StaticPage
      eyebrow="About"
      title="About Docent"
      description="A context-aware AI document assistant — ask questions of your own PDFs and Markdown files, and get answers you can actually verify."
      after={
        <Button
          href="https://github.com/Devputta/Doset"
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          size="md"
        >
          <GithubIcon className="h-4 w-4" />
          View on GitHub
        </Button>
      }
    >
      <h2>Why this exists</h2>
      <p>
        Pasting a long document into a generic chatbot loses page numbers, mixes in
        the model&apos;s outside knowledge, and gives no way to check an answer against
        the source. Docent is scoped narrowly on purpose: every answer is retrieved
        from the document you uploaded, cited inline, and clickable straight back to
        the exact page or heading it came from. If the document doesn&apos;t contain the
        answer, it says so rather than guessing.
      </p>

      <h2>How it works</h2>
      <p>
        Upload a PDF or Markdown file and it&apos;s extracted, split into chunks, and
        turned into embeddings stored in a vector database. When you ask a question,
        the most relevant chunks are retrieved and handed to an LLM along with strict
        instructions to answer only from that retrieved content — never from its own
        training data, and never treating text inside the document as instructions to
        follow.
      </p>

      <h2>What it&apos;s built with</h2>
      <ul>
        <li>Next.js (App Router) + React + TypeScript on the frontend</li>
        <li>FastAPI + Python on the backend</li>
        <li>LangChain for chunking, ChromaDB as the vector store</li>
        <li>OpenAI, Anthropic, or Google Gemini for embeddings and answer generation</li>
      </ul>

      <h2>Source code</h2>
      <p>Docent is open source — the full frontend and backend, including the RAG pipeline, are on GitHub.</p>
    </StaticPage>
  );
}
