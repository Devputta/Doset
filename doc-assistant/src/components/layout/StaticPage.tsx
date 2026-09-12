import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function StaticPage({
  eyebrow,
  title,
  description,
  children,
  after,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Rendered after the prose block, outside its `a`/typography styling — use this for CTA buttons. */
  after?: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-xs font-medium uppercase tracking-wide text-brand">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl text-text-primary sm:text-4xl">{title}</h1>
          {description && (
            <p className="mt-4 text-[17px] leading-relaxed text-text-secondary">{description}</p>
          )}
          <div className="prose-doc mt-10 max-w-none">{children}</div>
          {after && <div className="mt-6">{after}</div>}
        </div>
      </main>
      <Footer />
    </>
  );
}
