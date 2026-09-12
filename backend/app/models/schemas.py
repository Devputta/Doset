from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DocumentOut(CamelModel):
    id: str
    title: str
    filename: str
    type: Literal["pdf", "markdown"]
    status: Literal["uploaded", "processing", "ready", "failed"]
    size_bytes: int
    uploaded_at: str
    page_count: int | None = None
    chunk_count: int | None = None
    error_message: str | None = None


class DocumentListOut(CamelModel):
    documents: list[DocumentOut]


class ChatRequest(BaseModel):
    document_id: str
    question: str
    conversation_id: str | None = None


class SourceOut(BaseModel):
    document_id: str
    filename: str
    page: int | None = None
    heading: str | None = None
    chunk_id: str
    relevance_score: float
    snippet: str


class ChatResponseOut(BaseModel):
    answer: str
    conversation_id: str
    sources: list[SourceOut]


class CitationOut(CamelModel):
    """Matches the frontend's `Citation` type (src/types/document.ts) exactly —
    this is what gets embedded in a stored chat message, as opposed to
    `SourceOut`, which is the shape returned fresh from POST /api/chat."""

    id: str
    document_id: str
    document_title: str
    page: int | None = None
    heading: str | None = None
    chunk_id: str | None = None
    relevance_score: float | None = None
    snippet: str


class MessageOut(CamelModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    citations: list[CitationOut] | None = None
    created_at: str


class MessagesOut(CamelModel):
    messages: list[MessageOut]


class ConversationSummaryOut(CamelModel):
    id: str
    document_id: str
    document_title: str | None = None
    title: str | None = None
    created_at: str
    updated_at: str
    message_count: int
    last_message: str | None = None
    preview: str | None = None


class ConversationsOut(CamelModel):
    conversations: list[ConversationSummaryOut]


class RenameConversationRequest(BaseModel):
    title: str


class RenameDocumentRequest(BaseModel):
    title: str


class AccountSummaryOut(CamelModel):
    document_count: int
    conversation_count: int
    storage_used_bytes: int
    status_breakdown: dict[str, int]


class SuggestedQuestionsOut(BaseModel):
    questions: list[str]
