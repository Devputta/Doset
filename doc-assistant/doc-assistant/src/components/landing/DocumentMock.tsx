import { FileText, Sparkles } from "lucide-react";

export function DocumentMock() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      {/* Document card */}
      <div className="rounded-lg border border-border bg-surface p-5 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <FileText className="h-4 w-4 text-text-muted" />
          <span className="text-xs font-medium text-text-secondary">
            distributed-systems-notes.pdf
          </span>
          <span className="ml-auto font-mono text-[10px] text-text-muted">p. 12</span>
        </div>

        <div className="space-y-2.5">
          <div className="h-2 w-[92%] rounded-full bg-surface-2" />
          <div className="h-2 w-[78%] rounded-full bg-surface-2" />
          <span className="mark-highlight relative inline-block h-2 w-[86%] rounded-full bg-surface-2" />
          <div className="h-2 w-[65%] rounded-full bg-surface-2" />
          <span className="mark-highlight relative inline-block h-2 w-[90%] rounded-full bg-surface-2" />
          <div className="h-2 w-[70%] rounded-full bg-surface-2" />
          <div className="h-2 w-[55%] rounded-full bg-surface-2" />
        </div>
      </div>

      {/* Answer card, offset to overlap */}
      <div className="absolute -bottom-8 -right-6 w-[78%] rounded-lg border border-border bg-ink p-4 shadow-[0_12px_32px_rgba(20,22,31,0.28)] sm:-right-10">
        <div className="mb-2.5 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-highlight" />
          <span className="text-xs font-medium text-white/90">Answer</span>
        </div>
        <div className="space-y-2">
          <div className="h-1.5 w-full rounded-full bg-white/15" />
          <div className="h-1.5 w-[85%] rounded-full bg-white/15" />
          <div className="h-1.5 w-[60%] rounded-full bg-white/15" />
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-highlight font-mono text-[9px] font-semibold text-ink">
            1
          </span>
          <span className="font-mono text-[10px] text-white/50">
            distributed-systems-notes.pdf · p.12
          </span>
        </div>
      </div>
    </div>
  );
}
