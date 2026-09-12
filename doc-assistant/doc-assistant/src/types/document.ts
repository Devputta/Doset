/**
 * Domain types for the Context-Aware AI Document Assistant, shared between
 * every component and the typed fetch wrappers in `lib/documents-client.ts`.
 * These mirror the FastAPI backend's Pydantic schemas (see
 * backend/app/models/schemas.py) — camelCase here matches the camelCase the
 * backend serializes for document/conversation payloads.
 */

export type DocumentStatus =
  | "uploading" // client-side only: still streaming bytes to the server
  | "uploaded" // bytes saved, not yet queued for processing
  | "processing" // extraction/chunking/embeddings in progress on the backend
  | "ready" // chunks embedded and stored, safe to chat against
  | "failed";

export type DocumentType = "pdf" | "markdown";

export interface AppDocument {
  id: string;
  title: string;
  filename: string;
  type: DocumentType;
  status: DocumentStatus;
  pageCount?: number;
  sizeBytes: number;
  uploadedAt: string;
  chunkCount?: number;
  errorMessage?: string;
}

export interface Citation {
  id: string;
  documentId: string;
  documentTitle: string;
  page?: number;
  /** Markdown sources only — nearest heading, used to scroll instead of paginate. */
  heading?: string;
  chunkId?: string;
  relevanceScore?: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt: string;
}

export interface ChatSource {
  documentId: string;
  filename: string;
  /** PDF sources only — 1-indexed page number. */
  page?: number;
  /** Markdown sources only — nearest heading, used to scroll instead of paginate. */
  heading?: string;
  chunkId: string;
  relevanceScore: number;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  conversationId: string;
  sources: ChatSource[];
}

export interface ChatMessageWithState extends ChatMessage {
  status: "sending" | "generating" | "streaming" | "sent" | "error";
  errorMessage?: string;
}

export interface ConversationSummary {
  id: string;
  documentId: string;
  documentTitle: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}
