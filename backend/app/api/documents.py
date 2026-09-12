import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.core.security import CurrentUser
from app.models import db
from app.models.schemas import (
    ConversationSummaryOut,
    ConversationsOut,
    DocumentListOut,
    DocumentOut,
    RenameDocumentRequest,
    SuggestedQuestionsOut,
)
from app.rag.pipeline import process_document
from app.rag.suggestions import get_suggested_questions
from app.services.document_service import (
    UnsupportedFileTypeError,
    delete_user_document,
    get_user_document,
    list_user_documents,
    rename_user_document,
    upload_document,
)
from app.services.storage import FileTooLargeError, content_type_for

logger = logging.getLogger("doc_assistant.api.documents")

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut)
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        doc = await upload_document(user_id=user.id, upload=file)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc

    doc.pop("_dedupe_source", None)

    # Processing happens after the response goes out — the client sees
    # status="uploaded" immediately, then polls and watches it flip to
    # "processing" and finally "ready"/"failed". No pretending it's done
    # before the pipeline actually ran (the pipeline itself may still skip
    # re-embedding if this exact file was already processed — see
    # rag/pipeline.py — but that's decided there, not assumed here).
    background_tasks.add_task(process_document, document_id=doc["id"], user_id=user.id)

    return DocumentOut(**doc)


@router.get("", response_model=DocumentListOut)
async def list_documents(user: CurrentUser = Depends(get_current_user)):
    docs = list_user_documents(user.id)
    return DocumentListOut(documents=[DocumentOut(**d) for d in docs])


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(document_id: str, user: CurrentUser = Depends(get_current_user)):
    doc = get_user_document(document_id, user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut(**doc)


@router.delete("/{document_id}")
async def delete_document(document_id: str, user: CurrentUser = Depends(get_current_user)):
    deleted = delete_user_document(document_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": True, "id": document_id}


@router.patch("/{document_id}", response_model=DocumentOut)
async def rename_document(
    document_id: str, payload: RenameDocumentRequest, user: CurrentUser = Depends(get_current_user)
):
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="title must not be empty")
    doc = rename_user_document(document_id, user.id, payload.title)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut(**doc)


@router.get("/{document_id}/file")
async def get_document_file(
    document_id: str, download: bool = False, user: CurrentUser = Depends(get_current_user)
):
    doc = get_user_document(document_id, user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    extension = "." + doc["storage_path"].rsplit(".", 1)[-1]
    return FileResponse(
        doc["storage_path"],
        media_type=content_type_for(extension),
        filename=doc["filename"],
        content_disposition_type="attachment" if download else "inline",
    )


@router.get("/{document_id}/conversations", response_model=ConversationsOut)
async def get_conversations(document_id: str, user: CurrentUser = Depends(get_current_user)):
    doc = get_user_document(document_id, user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    rows = db.list_conversations(document_id, user.id)
    return ConversationsOut(
        conversations=[
            ConversationSummaryOut(
                id=r["id"],
                document_id=r["document_id"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                message_count=r["message_count"],
                preview=(r["preview"] or "")[:120],
            )
            for r in rows
        ]
    )


@router.get("/{document_id}/suggested-questions", response_model=SuggestedQuestionsOut)
async def suggested_questions(document_id: str, user: CurrentUser = Depends(get_current_user)):
    doc = get_user_document(document_id, user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return SuggestedQuestionsOut(questions=get_suggested_questions(document_id=document_id, user_id=user.id))
