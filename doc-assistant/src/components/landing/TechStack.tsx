import { SectionHeading } from "@/components/ui/SectionHeading";
import { techStack } from "@/lib/content";

export function TechStack() {
  return (
    <section id="technology" className="border-t border-border bg-ink">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          title="Built on a standard RAG stack"
          description="Nothing exotic — a retrieval pipeline built from tools that are easy to reason about, swap, and scale."
          className="[&_h2]:text-text-primary-inverse [&_p]:text-text-secondary-inverse"
        />

        <dl className="mt-12 divide-y divide-white/10 border-t border-white/10">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between"
            >
              <dt className="font-mono text-sm text-white/90">{tech.name}</dt>
              <dd className="text-sm text-white/45">{tech.role}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
