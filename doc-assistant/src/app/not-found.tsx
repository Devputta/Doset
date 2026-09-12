import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        <FileQuestion className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="font-display text-2xl text-text-primary">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          The page you&apos;re looking for doesn&apos;t exist, or may have moved.
        </p>
      </div>
      <Link
        href="/"
        className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
      >
        Back to home
      </Link>
    </div>
  );
}
