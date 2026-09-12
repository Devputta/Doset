import type { AppDocument, Conversation, StorageSummary } from "@/types/document";

// Day 1 renders the dashboard's real empty states — no seeded documents or
// conversations. This file exists so later days can swap these for live
// API calls without changing any component props.

export const mockDocuments: AppDocument[] = [];

export const mockConversations: Conversation[] = [];

export const mockStorageSummary: StorageSummary = {
  usedBytes: 0,
  limitBytes: 500 * 1024 * 1024,
  documentCount: 0,
  documentLimit: 20,
};
