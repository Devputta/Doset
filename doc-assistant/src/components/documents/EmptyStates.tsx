import { FileText, FileSearch, MessageSquareOff, Loader2, AlertTriangle, Quote, MousePointerClick } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function NoDocumentsEmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <EmptyState
      icon={<FileText className="h-5 w-5" strokeWidth={1.75} />}
      title="No documents uploaded"
      description="PDF and Markdown files you upload will appear here, along with their processing status."
      action={
        <Button size="sm" className="mt-1" onClick={onUploadClick}>
          Upload your first document
        </Button>
      }
    />
  );
}

export function NoSearchResultsEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<FileSearch className="h-5 w-5" strokeWidth={1.75} />}
      title="No matching documents"
      description={`Nothing matches "${query}". Try a different search term or clear your filters.`}
    />
  );
}

export function NoDocumentSelectedEmptyState() {
  return (
    <EmptyState
      icon={<MousePointerClick className="h-5 w-5" strokeWidth={1.75} />}
      title="No document open"
      description="Choose a document from your library to preview it and start asking questions."
    />
  );
}

export function NoConversationEmptyState() {
  return (
    <EmptyState
      icon={<MessageSquareOff className="h-5 w-5" strokeWidth={1.75} />}
      title="No messages yet"
      description="Ask a question below, or try one of the suggested questions to get started."
    />
  );
}

export function NoCitationsEmptyState() {
  return (
    <p className="text-xs italic text-text-muted">
      No sources were returned for this answer.
    </p>
  );
}

export function DocumentProcessingEmptyState() {
  return (
    <EmptyState
      icon={<Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />}
      title="Processing document"
      description="Extracting text, splitting it into chunks, and generating embeddings. This usually takes a few seconds — chat unlocks once it's ready."
    />
  );
}

export function DocumentFailedEmptyState({ message }: { message?: string }) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.75} />}
      title="Processing failed"
      description={message || "Something went wrong while processing this document. Try re-uploading it."}
    />
  );
}

export function NoSourcesForAnswerEmptyState() {
  return (
    <EmptyState
      icon={<Quote className="h-5 w-5" strokeWidth={1.75} />}
      title="Nothing found in the document"
      description="The document doesn't contain enough information to answer that confidently."
    />
  );
}
