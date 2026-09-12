"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, RotateCcw, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, isAcceptedFile, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/config";
import { uploadDocument } from "@/lib/documents-client";
import type { AppDocument } from "@/types/document";

type QueueItemStatus = "pending" | "uploading" | "success" | "error";

interface QueueItem {
  id: string;
  file: File;
  status: QueueItemStatus;
  progress: number;
  errorMessage?: string;
  abort?: () => void;
}

function validate(file: File): string | null {
  if (!isAcceptedFile(file)) {
    return "Unsupported file type. Upload a .pdf, .md, or .markdown file.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
  }
  if (file.size === 0) {
    return "File is empty.";
  }
  return null;
}

export function UploadDropzone({ onUploaded }: { onUploaded: (doc: AppDocument) => void }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startUpload = useCallback((item: QueueItem) => {
    const { promise, abort } = uploadDocument(item.file, (percent) => {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: percent } : i)));
    });

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", abort, errorMessage: undefined } : i))
    );

    promise
      .then((doc) => {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "success", progress: 100 } : i)));
        onUploaded(doc);
      })
      .catch((err: Error) => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "error", errorMessage: err.message || "Upload failed" } : i
          )
        );
      });
  }, [onUploaded]);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const newItems: QueueItem[] = files.map((file) => {
        const error = validate(file);
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          status: error ? "error" : "pending",
          progress: 0,
          errorMessage: error ?? undefined,
        };
      });

      setItems((prev) => [...newItems, ...prev]);
      newItems.filter((i) => i.status === "pending").forEach(startUpload);
    },
    [startUpload]
  );

  const retry = (item: QueueItem) => {
    const error = validate(item.file);
    if (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error", errorMessage: error } : i)));
      return;
    }
    startUpload(item);
  };

  const cancel = (item: QueueItem) => {
    item.abort?.();
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const dismiss = (item: QueueItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
          isDragging ? "border-brand bg-brand-soft" : "border-border hover:bg-surface-2"
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-text-muted">
          <UploadCloud className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-text-primary">
          Drag and drop files, or <span className="text-brand">browse</span>
        </p>
        <p className="text-xs text-text-secondary">
          PDF or Markdown (.md, .markdown) — up to {MAX_FILE_SIZE_MB} MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.md,.markdown,application/pdf,text/markdown"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-muted">
                {item.status === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : item.status === "error" ? (
                  <AlertCircle className="h-4 w-4 text-danger" />
                ) : (
                  <FileUp className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{item.file.name}</p>
                {item.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === "error" && (
                  <p className="mt-0.5 text-xs text-danger">{item.errorMessage}</p>
                )}
                {item.status === "pending" && <p className="text-xs text-text-secondary">Waiting…</p>}
                {item.status === "success" && (
                  <p className="text-xs text-text-secondary">{formatBytes(item.file.size)} — uploaded</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {item.status === "uploading" && (
                  <button
                    onClick={() => cancel(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text-primary"
                    aria-label="Cancel upload"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {item.status === "error" && (
                  <button
                    onClick={() => retry(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text-primary"
                    aria-label="Retry upload"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                {(item.status === "success" || item.status === "error") && (
                  <button
                    onClick={() => dismiss(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text-primary"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
