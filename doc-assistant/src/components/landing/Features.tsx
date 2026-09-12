import { SectionHeading } from "@/components/ui/SectionHeading";
import { features } from "@/lib/content";

export function Features() {
  return (
    <section id="features" className="border-t border-border bg-surface-2/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          title="Everything the answer needs, nothing it doesn't"
          description="The assistant only ever answers from what it retrieves from your documents — every capability below exists to make that retrieval accurate and verifiable."
        />

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="bg-background p-6">
              <feature.icon className="h-5 w-5 text-brand" strokeWidth={1.75} />
              <h3 className="mt-4 text-[15px] font-semibold text-text-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
