"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import {
  Send,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Plus,
  History,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  deleteConversation,
  getConversationMessages,
  getSuggestedQuestions,
  listConversations,
  streamAskDocument,
} from "@/lib/documents-client";
import {
  NoConversationEmptyState,
  NoSourcesForAnswerEmptyState,
} from "@/components/documents/EmptyStates";
import { getPreferences } from "@/lib/preferences";
import type {
  AppDocument,
  ChatMessageWithState,
  Citation,
  ConversationSummary,
} from "@/types/document";

const FALLBACK_QUESTIONS = [
  "What is this document about?",
  "Summarize the main points.",
  "What are the important requirements?",
  "Explain this section in simple terms.",
];

function newId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Splits an answer on bracketed citation markers like "[Page 12]" so they render as clickable buttons. */
function AnswerWithCitations({
  text,
  sources,
  onJump,
}: {
  text: string;
  sources: Citation[];
  onJump: (source: Citation) => void;
}) {
  const parts = text.split(/(\[[^[\]]{1,40}\])/g);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
      {parts.map((part, i) => {
        const match = /^\[([^[\]]{1,40})\]$/.exec(part);
        if (!match) return <Fragment key={i}>{part}</Fragment>;

        const label = match[1];
        const pageMatch = /page\s*(\d+)/i.exec(label);
        const source = pageMatch
          ? sources.find((s) => s.page === Number(pageMatch[1]))
          : sources.find((s) => s.heading && label.toLowerCase().includes(s.heading.toLowerCase()));

        if (!source) return <Fragment key={i}>{part}</Fragment>;

        return (
          <button
            key={i}
            onClick={() => onJump(source)}
            className="mx-0.5 rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand hover:bg-brand/20"
          >
            {label}
          </button>
        );
      })}
    </p>
  );
}

function SourcesPanel({ sources, onJump }: { sources: Citation[]; onJump: (s: Citation) => void }) {
  if (sources.length === 0) return <NoSourcesForAnswerEmptyState />;
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Sources</p>
      {sources.map((s, i) => (
        <button
          key={s.chunkId ?? i}
          onClick={() => onJump(s)}
          className="flex w-full flex-col items-start gap-0.5 rounded-md border border-border bg-surface-2 px-3 py-2 text-left hover:border-brand/50"
        >
          <div className="flex w-full items-center gap-1.5 text-xs font-medium text-text-primary">
            <FileText className="h-3 w-3 text-text-muted" />
            Source {i + 1}
            <span className="text-text-muted">·</span>
            <span className="truncate">{s.documentTitle}</span>
            {typeof s.page === "number" && <span className="text-brand">Page {s.page}</span>}
            {s.heading && <span className="text-brand">{s.heading}</span>}
          </div>
          {s.snippet && <p className="line-clamp-2 text-xs text-text-secondary">&ldquo;{s.snippet}&rdquo;</p>}
        </button>
      ))}
    </div>
  );
}

export function ChatPanel({
  document,
  onJumpToPage,
  onJumpToHeading,
}: {
  document: AppDocument;
  onJumpToPage: (page: number, snippet?: string) => void;
  onJumpToHeading: (heading: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessageWithState[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(FALLBACK_QUESTIONS);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => abortRef.current?.();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    setMessages([]);
    setConversationId(null);
    getSuggestedQuestions(document.id)
      .then((qs) => setSuggestions(qs.length > 0 ? qs : FALLBACK_QUESTIONS))
      .catch(() => setSuggestions(FALLBACK_QUESTIONS));
  }, [document.id]);

  const jump = useCallback(
    (source: Citation) => {
      if (typeof source.page === "number") onJumpToPage(source.page, source.snippet);
      else if (source.heading) onJumpToHeading(source.heading);
    },
    [onJumpToPage, onJumpToHeading]
  );

  const sendQuestion = useCallback(
    (question: string, retryMessageId?: string) => {
      const trimmed = question.trim();
      if (!trimmed || sending) return;

      const userMsgId = retryMessageId ?? newId();
      const assistantMsgId = newId();

      setMessages((prev) => {
        const withoutOldError = prev.filter((m) => m.id !== retryMessageId);
        return [
          ...withoutOldError,
          { id: userMsgId, role: "user", content: trimmed, createdAt: new Date().toISOString(), status: "sent" },
          {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            citations: [],
            createdAt: new Date().toISOString(),
            status: "generating",
          },
        ];
      });
      setInput("");
      setSending(true);

      const { abort } = streamAskDocument(document.id, trimmed, conversationId, {
        onStart: (newConversationId) => setConversationId(newConversationId),
        onDelta: (text) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, status: "streaming", content: m.content + text }
                : m
            )
          );
        },
        onDone: ({ conversationId: finalConversationId, answer, sources }) => {
          setConversationId(finalConversationId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    status: "sent",
                    content: answer,
                    citations: sources.map((s) => ({
                      id: s.chunkId,
                      documentId: s.documentId,
                      documentTitle: s.filename,
                      page: s.page,
                      heading: s.heading,
                      chunkId: s.chunkId,
                      relevanceScore: s.relevanceScore,
                      snippet: s.snippet,
                    })),
                  }
                : m
            )
          );
          setSending(false);
          abortRef.current = null;
        },
        onError: (message) => {
          setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
          setMessages((prev) =>
            prev.map((m) => (m.id === userMsgId ? { ...m, status: "error", errorMessage: message } : m))
          );
          setSending(false);
          abortRef.current = null;
        },
      });

      abortRef.current = abort;
    },
    [conversationId, document.id, sending]
  );

  const handleRetry = (message: ChatMessageWithState) => {
    sendQuestion(message.content, message.id);
  };

  const handleCopy = async (message: ChatMessageWithState) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setHistoryOpen(false);
  };

  const clearConversation = async () => {
    if (conversationId) {
      await deleteConversation(conversationId).catch(() => {});
    }
    startNewConversation();
  };

  const openHistory = async () => {
    setHistoryOpen((v) => !v);
    if (!historyOpen) {
      try {
        setConversations(await listConversations(document.id));
      } catch {
        setConversations([]);
      }
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const msgs = await getConversationMessages(id);
      setMessages(msgs.map((m) => ({ ...m, status: "sent" as const })));
      setConversationId(id);
      setHistoryOpen(false);
    } catch {
      // leave current conversation untouched on failure
    }
  };

  const canSend = input.trim().length > 0 && !sending;

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-medium text-text-primary">Chat</p>
        <div className="flex items-center gap-1">
          <button
            onClick={openHistory}
            className={cn(
              "flex h-7 items-center gap-1 rounded-md px-2 text-xs text-text-secondary hover:bg-surface-2",
              historyOpen && "bg-surface-2"
            )}
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
          <button
            onClick={startNewConversation}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-text-secondary hover:bg-surface-2"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          <button
            onClick={clearConversation}
            disabled={messages.length === 0}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-text-secondary hover:bg-surface-2 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {historyOpen && (
        <div className="max-h-40 overflow-auto border-b border-border bg-surface-2 px-2 py-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-1 text-xs text-text-secondary">No past conversations for this document.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-surface"
              >
                <span className="truncate text-xs font-medium text-text-primary">{c.preview || "New conversation"}</span>
                <span className="text-[11px] text-text-muted">
                  {c.messageCount} messages · {new Date(c.updatedAt).toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <NoConversationEmptyState />
            {getPreferences().showSuggestedQuestions && (
              <div className="flex flex-wrap justify-center gap-2 px-4">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendQuestion(q)}
                    className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:border-brand/40 hover:text-text-primary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex flex-col items-end gap-1">
                <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-brand px-3 py-2 text-sm text-white">
                  {m.content}
                </div>
                {m.status === "error" && (
                  <div className="flex items-center gap-1.5 text-xs text-danger">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {m.errorMessage ?? "Failed to send"}
                    <button onClick={() => handleRetry(m)} className="flex items-center gap-0.5 font-medium underline">
                      <RotateCcw className="h-3 w-3" /> Retry
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div key={m.id} className="max-w-[92%] rounded-lg rounded-tl-sm border border-border bg-surface-2 px-3 py-2.5">
                {m.status === "generating" ? (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating…
                  </div>
                ) : (
                  <>
                    <AnswerWithCitations text={m.content} sources={m.citations ?? []} onJump={jump} />
                    {m.status === "streaming" && (
                      <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-text-muted align-middle" />
                    )}
                    {m.status === "sent" && (
                      <>
                        <SourcesPanel sources={m.citations ?? []} onJump={jump} />
                        <button
                          onClick={() => handleCopy(m)}
                          className="mt-2 flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
                        >
                          {copiedId === m.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedId === m.id ? "Copied" : "Copy answer"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )
          )
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendQuestion(input);
              }
            }}
            placeholder={
              document.status === "ready" ? "Ask a question about this document…" : "Waiting for document to finish processing…"
            }
            disabled={document.status !== "ready"}
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50"
          />
          <Button
            size="md"
            onClick={() => sendQuestion(input)}
            disabled={!canSend || document.status !== "ready"}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-text-muted">Enter to send · Shift + Enter for a new line</p>
      </div>
    </div>
  );
}
