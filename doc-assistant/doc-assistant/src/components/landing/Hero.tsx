import { Button } from "@/components/ui/Button";
import { DocumentMock } from "@/components/landing/DocumentMock";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
      <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-xl">
          <h1 className="font-display text-[40px] leading-[1.08] text-text-primary sm:text-[52px]">
            Chat with your documents. Understand them instantly.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-text-secondary">
            Upload a PDF or Markdown file. It&apos;s chunked, embedded, and stored
            in a vector database. Ask a question and get an answer grounded
            only in that document — with a citation you can click to jump
            straight to the source page.
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-wide text-text-muted">
            <span>Upload</span>
            <span aria-hidden>→</span>
            <span>Retrieve</span>
            <span aria-hidden>→</span>
            <span>Ask</span>
            <span aria-hidden>→</span>
            <span>Cite</span>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button href="/register" size="lg">
              Get Started
            </Button>
            <Button href="/dashboard" variant="secondary" size="lg">
              View Demo
            </Button>
          </div>
          <p className="mt-6 text-sm text-text-muted">
            No credit card required — this is a portfolio build, not a paid product.
          </p>
        </div>

        <div className="pt-4 lg:pt-0">
          <DocumentMock />
        </div>
      </div>
    </section>
  );
}
