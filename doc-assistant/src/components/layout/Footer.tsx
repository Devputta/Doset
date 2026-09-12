import Link from "next/link";
import { FileStack } from "lucide-react";
import { footerLinks } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">
                <FileStack className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-semibold text-text-primary">Docent</span>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">
              Context-Aware AI Document Assistant — ask questions of your own
              documents and get answers you can verify.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div className="space-y-3">
              <p className="text-xs font-medium text-text-muted">Project</p>
              <ul className="space-y-2">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium text-text-muted">About</p>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-text-muted">
            Context-Aware AI Document Assistant.
          </p>
        </div>
      </div>
    </footer>
  );
}
