import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user
from app.core.security import CurrentUser
from app.models import db
from app.models.schemas import (
    ChatRequest,
    ChatResponseOut,
    ConversationsOut,
    ConversationSummaryOut,
    MessageOut,
    MessagesOut,
    RenameConversationRequest,
    SourceOut,
)
from app.rag.retrieval import DocumentNotFoundError, DocumentNotReadyError, answer_question, stream_answer

logger = logging.getLogger("doc_assistant.api.chat")

router = APIRouter(prefix="/api", tags=["chat"])


def _validate_and_check_conversation(payload: ChatRequest, user_id: str) -> None:
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")
    if len(payload.question) > 4000:
        raise HTTPException(status_code=400, detail="question is too long (max 4000 characters)")

    if payload.conversation_id:
        conversation = db.get_conversation(payload.conversation_id, user_id)
        if not conversation or conversation["document_id"] != payload.document_id:
            raise HTTPException(status_code=404, detail="Conversation not found")


@router.post("/chat", response_model=ChatResponseOut)
async def chat(payload: ChatRequest, user: CurrentUser = Depends(get_current_user)):
    _validate_and_check_conversation(payload, user.id)

    try:
        result = answer_question(
            user_id=user.id,
            document_id=payload.document_id,
            question=payload.question,
            conversation_id=payload.conversation_id,
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DocumentNotReadyError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return ChatResponseOut(
        answer=result["answer"],
        conversation_id=result["conversation_id"],
        sources=[SourceOut(**s) for s in result["sources"]],
    )


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest, user: CurrentUser = Depends(get_current_user)):
    """Server-Sent Events: 'start' -> many 'delta' -> 'done' (or 'error').
    Each event is a JSON object on a single `data:` line, per the SSE spec."""
    _validate_and_check_conversation(payload, user.id)

    def sse(event_type: str, payload_dict: dict) -> str:
        return f"data: {json.dumps({'type': event_type, **payload_dict})}\n\n"

    def event_source():
        try:
            for event_type, data in stream_answer(
                user_id=user.id,
                document_id=payload.document_id,
                question=payload.question,
                conversation_id=payload.conversation_id,
            ):
                yield sse(event_type, data)
        except DocumentNotFoundError as exc:
            yield sse("error", {"message": str(exc)})
        except DocumentNotReadyError as exc:
            yield sse("error", {"message": str(exc)})
        except Exception:  # noqa: BLE001 - never let a raw traceback reach the stream
            logger.exception("Unhandled error while streaming chat response")
            yield sse("error", {"message": "Something went wrong generating a response."})

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering if deployed behind one
        },
    )


@router.get("/chat/conversations/{conversation_id}", response_model=MessagesOut)
async def get_conversation_messages(conversation_id: str, user: CurrentUser = Depends(get_current_user)):
    conversation = db.get_conversation(conversation_id, user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = db.list_messages(conversation_id)
    return MessagesOut(messages=[MessageOut(**m) for m in messages])


@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user: CurrentUser = Depends(get_current_user)):
    conversation = db.get_conversation(conversation_id, user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete_conversation(conversation_id, user.id)
    return {"deleted": True, "id": conversation_id}


@router.patch("/chat/conversations/{conversation_id}", response_model=ConversationSummaryOut)
async def rename_conversation(
    conversation_id: str, payload: RenameConversationRequest, user: CurrentUser = Depends(get_current_user)
):
    conversation = db.get_conversation(conversation_id, user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    title = payload.title.strip()[:120]
    if not title:
        raise HTTPException(status_code=400, detail="title must not be empty")

    db.rename_conversation(conversation_id, user.id, title)
    rows = db.list_all_conversations(user.id)
    updated = next((r for r in rows if r["id"] == conversation_id), None)
    return ConversationSummaryOut(**updated)


@router.get("/conversations", response_model=ConversationsOut)
async def list_conversations(search: str | None = None, user: CurrentUser = Depends(get_current_user)):
    rows = db.list_all_conversations(user.id, search=search)
    return ConversationsOut(conversations=[ConversationSummaryOut(**r) for r in rows])
