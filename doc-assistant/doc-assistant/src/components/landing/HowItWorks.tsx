import { SectionHeading } from "@/components/ui/SectionHeading";
import { steps } from "@/lib/content";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        title="From upload to a cited answer"
        description="Four steps happen behind every question you ask, so the answer you get back can always be traced to a source."
      />

      <div className="relative mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div
          aria-hidden
          className="absolute top-6 left-0 right-0 hidden h-px bg-border lg:block"
        />
        {steps.map((step, index) => (
          <div key={step.title} className="relative">
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background font-mono text-sm text-text-secondary">
              0{index + 1}
            </div>
            <step.icon className="mt-5 h-5 w-5 text-brand" strokeWidth={1.75} />
            <h3 className="mt-3 text-[15px] font-semibold text-text-primary">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
