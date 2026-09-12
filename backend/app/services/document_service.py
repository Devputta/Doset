import re
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.models import db
from app.rag import vectorstore
from app.services.storage import FileTooLargeError, delete_document_files, save_upload
from app.utils.ids import new_id

ALLOWED_EXTENSIONS = {".pdf": "pdf", ".md": "markdown", ".markdown": "markdown"}


class UnsupportedFileTypeError(Exception):
    pass


def _extension_and_type(filename: str) -> tuple[str, str]:
    lower = filename.lower()
    for ext, doc_type in ALLOWED_EXTENSIONS.items():
        if lower.endswith(ext):
            return ext, doc_type
    raise UnsupportedFileTypeError(
        f"Unsupported file type for '{filename}'. Only PDF and Markdown (.md, .markdown) are allowed."
    )


def _safe_display_name(filename: str) -> str:
    """The original filename is only ever used for display and for building
    the Content-Disposition header — never as part of a filesystem path (the
    document's UUID is used for that, see storage.py). Strip anything that
    isn't a normal filename character regardless, so it can never be used to
    smuggle path segments into headers or the UI."""
    name = Path(filename).name  # drops any directory components (path traversal)
    return re.sub(r"[^\w.\- ]", "_", name)[:255] or "document"


async def upload_document(*, user_id: str, upload: UploadFile) -> dict:
    if not upload.filename:
        raise UnsupportedFileTypeError("Missing filename.")

    safe_filename = _safe_display_name(upload.filename)
    extension, doc_type = _extension_and_type(safe_filename)
    document_id = new_id("doc")

    try:
        path, size, content_hash = await save_upload(user_id, document_id, upload, extension)
    except FileTooLargeError:
        raise

    title = Path(safe_filename).stem

    doc = db.create_document(
        id=document_id,
        user_id=user_id,
        title=title,
        filename=safe_filename,
        type=doc_type,
        storage_path=str(path),
        size_bytes=size,
        content_hash=content_hash,
    )
    doc["_dedupe_source"] = db.find_ready_document_by_hash(user_id, content_hash, exclude_id=document_id)
    return doc


def list_user_documents(user_id: str) -> list[dict]:
    return db.list_documents(user_id)


def get_user_document(document_id: str, user_id: str) -> dict | None:
    return db.get_document(document_id, user_id)


def rename_user_document(document_id: str, user_id: str, title: str) -> dict | None:
    doc = db.get_document(document_id, user_id)
    if not doc:
        return None
    clean_title = title.strip()[:255] or doc["title"]
    db.update_document(document_id, title=clean_title)
    return db.get_document(document_id, user_id)


def delete_user_document(document_id: str, user_id: str) -> bool:
    doc = db.get_document(document_id, user_id)
    if not doc:
        return False

    # Order matters least for correctness here (each store is independently
    # scoped to user_id + document_id) but this ordering means a retry after
    # a partial failure is always safe/idempotent.
    vectorstore.delete_document_chunks(user_id=user_id, document_id=document_id)
    delete_document_files(user_id, document_id)
    db.delete_document_row(document_id, user_id)  # cascades to conversations -> messages -> document_chunks
    return True


def max_file_size_mb() -> int:
    return settings.max_file_size_mb
