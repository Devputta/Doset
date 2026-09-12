"use client";

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UploadDropzone } from "@/components/documents/UploadDropzone";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { DeleteDocumentDialog } from "@/components/documents/DeleteDocumentDialog";
import {
  DocumentsToolbar,
  type SortKey,
  type StatusFilter,
  type TypeFilter,
} from "@/components/documents/DocumentsToolbar";
import { NoDocumentsEmptyState, NoSearchResultsEmptyState } from "@/components/documents/EmptyStates";
import { deleteDocument, listDocuments, renameDocument } from "@/lib/documents-client";
import type { AppDocument } from "@/types/document";

const ACTIVE_STATUSES = new Set(["uploading", "uploaded", "processing"]);

export default function DocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsPageContent />
    </Suspense>
  );
}

function DocumentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(() => searchParams.get("upload") === "1");
  const [pendingDelete, setPendingDelete] = useState<AppDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while any document is still uploading/processing so status badges
  // (and Chat button availability) update without a manual refresh.
  useEffect(() => {
    const hasActive = documents.some((d) => ACTIVE_STATUSES.has(d.status));
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(refresh, 3000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [documents, refresh]);

  const filtered = useMemo(() => {
    let result = documents;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") {
      result = result.filter((d) => d.type === typeFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((d) =>
        statusFilter === "processing"
          ? ACTIVE_STATUSES.has(d.status)
          : d.status === statusFilter
      );
    }
    const sorted = [...result];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
        break;
      case "oldest":
        sorted.sort((a, b) => +new Date(a.uploadedAt) - +new Date(b.uploadedAt));
        break;
      case "name":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "size":
        sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
        break;
    }
    return sorted;
  }, [documents, query, typeFilter, statusFilter, sort]);

  const handleUploaded = (doc: AppDocument) => {
    setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
  };

  const handleRename = async (doc: AppDocument, title: string) => {
    const previous = documents;
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, title } : d)));
    try {
      const updated = await renameDocument(doc.id, title);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
    } catch (err) {
      setDocuments(previous);
      setLoadError(err instanceof Error ? err.message : "Failed to rename document");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteDocument(pendingDelete.id);
      setDocuments((prev) => prev.filter((d) => d.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const isFiltering = query.trim().length > 0 || typeFilter !== "all" || statusFilter !== "all";

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-text-primary">Documents</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Upload and manage the documents you can ask questions about.
            </p>
          </div>
          <Button size="md" onClick={() => setShowUpload((v) => !v)}>
            {showUpload ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showUpload ? "Close" : "Upload document"}
          </Button>
        </div>

        {showUpload && (
          <Card>
            <CardContent>
              <UploadDropzone onUploaded={handleUploaded} />
            </CardContent>
          </Card>
        )}

        {loadError && (
          <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {loadError}
          </div>
        )}

        {!loading && documents.length > 0 && (
          <DocumentsToolbar
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-text-secondary">Loading documents…</CardContent>
          </Card>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent>
              <NoDocumentsEmptyState onUploadClick={() => setShowUpload(true)} />
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent>
              {isFiltering ? (
                <NoSearchResultsEmptyState query={query || "your filters"} />
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onOpen={(d) => router.push(`/dashboard/documents/${d.id}`)}
                onChat={(d) => router.push(`/dashboard/documents/${d.id}?focus=chat`)}
                onDelete={(d) => setPendingDelete(d)}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <DeleteDocumentDialog
          document={pendingDelete}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </DashboardShell>
  );
}
