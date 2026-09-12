"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, FileText, MessageSquare } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import type { PdfViewerHandle } from "@/components/documents/PdfViewer";
import { MarkdownViewer, type MarkdownViewerHandle } from "@/components/documents/MarkdownViewer";
import { ChatPanel } from "@/components/documents/ChatPanel";
import {
  DocumentFailedEmptyState,
  DocumentProcessingEmptyState,
} from "@/components/documents/EmptyStates";
import { getDocument } from "@/lib/documents-client";
import { cn } from "@/lib/utils";
import type { AppDocument } from "@/types/document";

// react-pdf touches Canvas/DOMMatrix at module load — it must never run
// during server rendering.
const PdfViewer = dynamic(
  () => import("@/components/documents/PdfViewer").then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        Loading PDF viewer…
      </div>
    ),
  }
);

export default function DocumentViewerPage() {
  return (
    <Suspense fallback={null}>
      <DocumentViewerPageContent />
    </Suspense>
  );
}

function DocumentViewerPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [doc, setDoc] = useState<AppDocument | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<"document" | "chat">(
    searchParams.get("focus") === "chat" ? "chat" : "document"
  );

  const pdfRef = useRef<PdfViewerHandle>(null);
  const markdownRef = useRef<MarkdownViewerHandle>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const d = await getDocument(params.id);
        if (cancelled) return;
        setDoc(d);
        setLoadError(null);

        if (d.type === "markdown" && d.status === "ready") {
          const res = await fetch(`/api/documents/${d.id}/file`, { credentials: "include" });
          if (!cancelled && res.ok) setMarkdownContent(await res.text());
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Poll while the document is still processing so the viewer/chat unlock automatically.
  useEffect(() => {
    if (doc && (doc.status === "processing" || doc.status === "uploaded")) {
      pollRef.current = setInterval(async () => {
        const fresh = await getDocument(params.id).catch(() => null);
        if (fresh) setDoc(fresh);
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [doc, params.id]);

  const handleJumpToPage = (page: number, snippet?: string) => pdfRef.current?.goToPage(page, snippet);
  const handleJumpToHeading = (heading: string) => markdownRef.current?.scrollToHeading(heading);

  return (
    <DashboardShell>
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/documents")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
            aria-label="Back to documents"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg text-text-primary">{doc?.title ?? "Document"}</h1>
          </div>
          {doc && <DocumentStatusBadge status={doc.status} />}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-text-secondary">Loading…</div>
        ) : loadError || !doc ? (
          <div className="flex flex-1 items-center justify-center text-sm text-danger">
            {loadError ?? "Document not found."}
          </div>
        ) : (
          <>
            {/* Mobile/tablet: tabbed instead of split — the two panes don't
                fit side by side below the lg breakpoint. */}
            <div className="flex gap-1 rounded-md bg-surface-2 p-1 lg:hidden">
              <button
                onClick={() => setMobileTab("document")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  mobileTab === "document" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Document
              </button>
              <button
                onClick={() => setMobileTab("chat")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  mobileTab === "chat" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
              <div className={cn("min-h-0", mobileTab !== "document" && "hidden lg:block")}>
                {doc.status === "failed" ? (
                  <div className="flex h-full items-center justify-center rounded-lg border border-border bg-surface">
                    <DocumentFailedEmptyState message={doc.errorMessage} />
                  </div>
                ) : doc.status !== "ready" ? (
                  <div className="flex h-full items-center justify-center rounded-lg border border-border bg-surface">
                    <DocumentProcessingEmptyState />
                  </div>
                ) : doc.type === "pdf" ? (
                  <PdfViewer ref={pdfRef} fileUrl={`/api/documents/${doc.id}/file`} />
                ) : markdownContent !== null ? (
                  <MarkdownViewer ref={markdownRef} content={markdownContent} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                    Loading preview…
                  </div>
                )}
              </div>

              <div className={cn("min-h-0", mobileTab !== "chat" && "hidden lg:block")}>
                <ChatPanel
                  document={doc}
                  onJumpToPage={(page, snippet) => {
                    setMobileTab("document");
                    handleJumpToPage(page, snippet);
                  }}
                  onJumpToHeading={(heading) => {
                    setMobileTab("document");
                    handleJumpToHeading(heading);
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
