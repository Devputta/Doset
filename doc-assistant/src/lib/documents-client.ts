import type { AppDocument, ChatMessage, ChatResponse, ChatSource, ConversationSummary } from "@/types/document";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.message ?? body?.error ?? response.statusText;
  } catch {
    return response.statusText || "Request failed";
  }
}

export async function listDocuments(): Promise<AppDocument[]> {
  const res = await fetch("/api/documents", { credentials: "include" });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  const data = await res.json();
  return data.documents as AppDocument[];
}

export async function getDocument(id: string): Promise<AppDocument> {
  const res = await fetch(`/api/documents/${id}`, { credentials: "include" });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return (await res.json()) as AppDocument;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
}

export async function askDocument(
  documentId: string,
  question: string,
  conversationId?: string | null
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, question, conversationId }),
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  const data = await res.json();
  return {
    answer: data.answer,
    conversationId: data.conversation_id ?? data.conversationId,
    sources: (data.sources ?? []).map(
      (s: {
        document_id: string;
        filename: string;
        page?: number;
        heading?: string;
        chunk_id: string;
        relevance_score: number;
        snippet?: string;
      }) => ({
        documentId: s.document_id,
        filename: s.filename,
        page: s.page,
        heading: s.heading,
        chunkId: s.chunk_id,
        relevanceScore: s.relevance_score,
        snippet: s.snippet ?? "",
      })
    ),
  };
}

export async function listConversations(documentId: string): Promise<ConversationSummary[]> {
  const res = await fetch(`/api/documents/${documentId}/conversations`, { credentials: "include" });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  const data = await res.json();
  return (data.conversations ?? []).map(
    (c: {
      id: string;
      documentId: string;
      documentTitle?: string;
      title?: string;
      createdAt: string;
      updatedAt: string;
      messageCount: number;
      preview?: string;
      lastMessage?: string;
    }) => ({
      id: c.id,
      documentId: c.documentId,
      documentTitle: c.documentTitle ?? "",
      title: c.title ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c.messageCount,
      preview: c.preview ?? c.lastMessage ?? "",
    })
  );
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/chat/conversations/${conversationId}`, { credentials: "include" });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  const data = await res.json();
  return (data.messages ?? []) as ChatMessage[];
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
}

export async function renameDocument(id: string, title: string): Promise<AppDocument> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return (await res.json()) as AppDocument;
}

export function documentDownloadUrl(id: string): string {
  return `/api/documents/${id}/file?download=true`;
}

export async function getAccountSummary(): Promise<{
  documentCount: number;
  conversationCount: number;
  storageUsedBytes: number;
  statusBreakdown: Record<string, number>;
}> {
  const res = await fetch("/api/account/summary", { credentials: "include" });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return res.json();
}

export async function listAllConversations(search?: string): Promise<ConversationSummary[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`/api/conversations${qs}`, { credentials: "include" });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  const data = await res.json();
  return (data.conversations ?? []).map(
    (c: {
      id: string;
      documentId: string;
      documentTitle?: string;
      title?: string;
      createdAt: string;
      updatedAt: string;
      messageCount: number;
      lastMessage?: string;
    }) => ({
      id: c.id,
      documentId: c.documentId,
      documentTitle: c.documentTitle ?? "",
      title: c.title ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c.messageCount,
      preview: c.lastMessage ?? "",
    })
  );
}

export async function renameConversationTitle(id: string, title: string): Promise<void> {
  const res = await fetch(`/api/chat/conversations/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
}

export interface StreamChatCallbacks {
  onStart?: (conversationId: string) => void;
  onDelta: (text: string) => void;
  onDone: (final: { conversationId: string; answer: string; sources: ChatSource[] }) => void;
  onError: (message: string) => void;
}

/**
 * Reads the backend's Server-Sent Events stream by hand (rather than the
 * browser's EventSource, which can't send a POST body or custom headers).
 * Each SSE frame is a single `data: {...}` line; frames are separated by a
 * blank line, per the SSE spec.
 */
export function streamAskDocument(
  documentId: string,
  question: string,
  conversationId: string | null | undefined,
  callbacks: StreamChatCallbacks
): { abort: () => void } {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question, conversationId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        callbacks.onError(await parseErrorMessage(res));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const json = line.slice("data: ".length);
          let event: { type: string; [key: string]: unknown };
          try {
            event = JSON.parse(json);
          } catch {
            continue;
          }

          if (event.type === "start") {
            callbacks.onStart?.(event.conversation_id as string);
          } else if (event.type === "delta") {
            callbacks.onDelta(event.text as string);
          } else if (event.type === "done") {
            const rawSources = (event.sources as Record<string, unknown>[]) ?? [];
            callbacks.onDone({
              conversationId: event.conversation_id as string,
              answer: event.answer as string,
              sources: rawSources.map((s) => ({
                documentId: s.document_id,
                filename: s.filename,
                page: s.page,
                heading: s.heading,
                chunkId: s.chunk_id,
                relevanceScore: s.relevance_score,
                snippet: s.snippet,
              })),
            });
          } else if (event.type === "error") {
            callbacks.onError((event.message as string) ?? "Something went wrong.");
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      callbacks.onError(err instanceof Error ? err.message : "Network error");
    }
  })();

  return { abort: () => controller.abort() };
}

export async function getSuggestedQuestions(documentId: string): Promise<string[]> {
  const res = await fetch(`/api/documents/${documentId}/suggested-questions`, {
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  const data = await res.json();
  return data.questions ?? [];
}

/**
 * Uploads via XHR (not fetch) so we can report real upload progress. Returns
 * an object with the in-flight promise plus an `abort()` you can wire to a
 * "Cancel" button.
 */
export function uploadDocument(
  file: File,
  onProgress: (percent: number) => void
): { promise: Promise<AppDocument>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const form = new FormData();
  form.set("file", file, file.name);

  const promise = new Promise<AppDocument>((resolve, reject) => {
    xhr.open("POST", "/api/documents/upload");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // fall through to generic error below
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as AppDocument);
      } else {
        const message =
          (body as { message?: string; error?: string } | null)?.message ??
          (body as { message?: string; error?: string } | null)?.error ??
          `Upload failed (${xhr.status})`;
        reject(new ApiError(message, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network error during upload", 0));
    xhr.onabort = () => reject(new ApiError("Upload cancelled", 0));

    xhr.send(form);
  });

  return { promise, abort: () => xhr.abort() };
}
