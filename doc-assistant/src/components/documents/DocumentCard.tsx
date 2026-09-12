"use client";

import { useState } from "react";
import {
  FileText,
  FileCode,
  MessageSquare,
  Trash2,
  ExternalLink,
  MoreVertical,
  Pencil,
  Download,
  Check,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { formatBytes } from "@/lib/config";
import { documentDownloadUrl } from "@/lib/documents-client";
import type { AppDocument } from "@/types/document";

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function DocumentCard({
  document,
  onOpen,
  onChat,
  onDelete,
  onRename,
}: {
  document: AppDocument;
  onOpen: (doc: AppDocument) => void;
  onChat: (doc: AppDocument) => void;
  onDelete: (doc: AppDocument) => void;
  onRename: (doc: AppDocument, title: string) => void;
}) {
  const canChat = document.status === "ready";
  const Icon = document.type === "pdf" ? FileText : FileCode;

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(document.title);

  const commitRename = () => {
    setRenaming(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== document.title) onRename(document, trimmed);
    else setTitleDraft(document.title);
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-muted">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setTitleDraft(document.title);
                    setRenaming(false);
                  }
                }}
                className="h-7 flex-1 rounded border border-border bg-background px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <button onClick={commitRename} className="text-success" aria-label="Save name">
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setTitleDraft(document.title);
                  setRenaming(false);
                }}
                className="text-text-muted"
                aria-label="Cancel rename"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="truncate text-sm font-medium text-text-primary" title={document.title}>
              {document.title}
            </p>
          )}
          <p className="mt-0.5 text-xs text-text-secondary">
            {document.type === "pdf" ? "PDF" : "Markdown"} · {formatBytes(document.sizeBytes)} ·{" "}
            {relativeDate(document.uploadedAt)}
          </p>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text-primary"
            aria-label="More actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-36 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
              <button
                onMouseDown={() => {
                  setRenaming(true);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-surface-2"
              >
                <Pencil className="h-3.5 w-3.5" /> Rename
              </button>
              <a
                href={documentDownloadUrl(document.id)}
                onMouseDown={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-surface-2"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <DocumentStatusBadge status={document.status} />
        {document.status === "failed" && document.errorMessage && (
          <span className="truncate pl-2 text-xs text-danger" title={document.errorMessage}>
            {document.errorMessage}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" variant="secondary" onClick={() => onOpen(document)} className="flex-1">
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onChat(document)}
          disabled={!canChat}
          className="flex-1"
          title={canChat ? undefined : "Document must finish processing before you can chat with it"}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Chat
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(document)}
          aria-label={`Delete ${document.title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
