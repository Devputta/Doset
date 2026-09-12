import { Button } from "@/components/ui/Button";

export function CallToAction() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="rounded-lg border border-border bg-surface-2 px-8 py-14 text-center sm:px-16">
        <h2 className="font-display text-[28px] leading-tight text-text-primary sm:text-[34px]">
          Try it with one of your own documents
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-text-secondary">
          The dashboard below is a preview of the authenticated workspace —
          uploads and question-answering ship in the next milestone.
        </p>
        <div className="mt-8 flex justify-center">
          <Button href="/dashboard" size="lg">
            Open the dashboard
          </Button>
        </div>
      </div>
    </section>
  );
}
