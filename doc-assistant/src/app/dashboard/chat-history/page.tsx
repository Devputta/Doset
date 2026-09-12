"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessagesSquare, Search, Pencil, Trash2, ExternalLink, Check, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/context/ToastContext";
import { deleteConversation, listAllConversations, renameConversationTitle } from "@/lib/documents-client";
import type { ConversationSummary } from "@/types/document";

function relativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ChatHistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      setConversations(await listAllConversations(search));
    } catch (err) {
      toast({
        title: "Couldn't load chat history",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => load(query.trim() || undefined), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const startRename = (c: ConversationSummary) => {
    setEditingId(c.id);
    setEditingValue(c.title || c.preview.slice(0, 60) || "Untitled conversation");
  };

  const commitRename = async (id: string) => {
    const title = editingValue.trim();
    setEditingId(null);
    if (!title) return;
    try {
      await renameConversationTitle(id, title);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    } catch (err) {
      toast({ title: "Rename failed", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(null);
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Conversation deleted", variant: "success" });
    } catch (err) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="font-display text-2xl text-text-primary">Chat history</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Every conversation is scoped to the document it was asked about.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, answers, or documents…"
            className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-text-secondary">Loading…</CardContent>
          </Card>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={<MessagesSquare className="h-5 w-5" strokeWidth={1.75} />}
                title={query ? "No matching conversations" : "No conversations yet"}
                description={
                  query
                    ? `Nothing matches "${query}".`
                    : "Upload a document and ask it a question to start a conversation."
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {editingId === c.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(c.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-7 flex-1 rounded border border-border bg-background px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                        <button onClick={() => commitRename(c.id)} className="text-success" aria-label="Save title">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-text-muted" aria-label="Cancel rename">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="truncate text-sm font-medium text-text-primary">
                        {c.title || c.preview.slice(0, 60) || "Untitled conversation"}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-xs text-text-secondary">
                      {c.documentTitle} · {c.messageCount} messages · {relativeDate(c.updatedAt)}
                    </p>
                    {c.preview && <p className="mt-1.5 line-clamp-1 text-xs text-text-muted">{c.preview}</p>}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => router.push(`/dashboard/documents/${c.documentId}?conversation=${c.id}`)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
                      aria-label="Open conversation"
                      title="Open"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => startRename(c)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
                      aria-label="Rename conversation"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {pendingDeleteId === c.id ? (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded-md bg-danger px-2 py-1 text-xs font-medium text-white"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setPendingDeleteId(c.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2 hover:text-danger"
                        aria-label="Delete conversation"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
