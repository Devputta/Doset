import Link from "next/link";
import { FileStack } from "lucide-react";
import { type ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-2/40 px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">
          <FileStack className="h-4 w-4" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-text-primary">
          Docent
        </span>
      </Link>

      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-7 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        <div className="mb-6 space-y-1.5 text-center">
          <h1 className="font-display text-xl text-text-primary">{title}</h1>
          {description && (
            <p className="text-sm text-text-secondary">{description}</p>
          )}
        </div>
        {children}
      </div>

      {footer && <div className="mt-6 text-sm text-text-secondary">{footer}</div>}
    </div>
  );
}
