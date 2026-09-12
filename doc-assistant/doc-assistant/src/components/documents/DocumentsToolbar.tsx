"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortKey = "newest" | "oldest" | "name" | "size";
export type TypeFilter = "all" | "pdf" | "markdown";
export type StatusFilter = "all" | "processing" | "ready" | "failed";

export function DocumentsToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (v: TypeFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
}) {
  const selectClass =
    "h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search documents…"
          className={cn(
            "h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm text-text-primary",
            "placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as TypeFilter)}
          className={selectClass}
          aria-label="Filter by file type"
        >
          <option value="all">All types</option>
          <option value="pdf">PDF</option>
          <option value="markdown">Markdown</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="processing">Processing</option>
          <option value="ready">Ready</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className={selectClass}
          aria-label="Sort documents"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name (A–Z)</option>
          <option value="size">Size</option>
        </select>
      </div>
    </div>
  );
}
