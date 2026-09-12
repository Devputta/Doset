"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AppDocument } from "@/types/document";

export function DeleteDocumentDialog({
  document,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  document: AppDocument;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onCancel} aria-hidden />
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Delete document?</h2>
            <p className="mt-1 text-sm text-text-secondary">
              This permanently removes <span className="font-medium text-text-primary">{document.title}</span>,
              its extracted text, embeddings, and any chats tied to it. This can&apos;t be undone.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-danger text-white hover:bg-danger/90"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
