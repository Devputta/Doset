import logging
from pathlib import Path

from app.models import db
from app.rag import vectorstore
from app.rag.chunking import Chunk, chunk_markdown_sections, chunk_pdf_sections
from app.rag.embeddings import get_embedding_service
from app.rag.loaders import load_markdown, load_pdf

logger = logging.getLogger("doc_assistant.pipeline")

# Embedding APIs cap how many inputs you can send per request; batch to stay
# comfortably under that regardless of provider.
_EMBED_BATCH_SIZE = 96


def process_document(*, document_id: str, user_id: str) -> None:
    """Runs synchronously in a background task. Never raises — failures are
    recorded on the document row as status='failed' so the UI can show them,
    per the "do not pretend a document is processed" requirement."""
    doc = db.get_document(document_id, user_id)
    if not doc:
        logger.error("process_document: document %s not found for user %s", document_id, user_id)
        return

    db.update_document(document_id, status="processing")

    try:
        # Day 7 perf: if this exact file was already uploaded and processed
        # by this user, clone its chunks/embeddings instead of paying for
        # extraction + embedding again.
        source = (
            db.find_ready_document_by_hash(user_id, doc["content_hash"], exclude_id=document_id)
            if doc.get("content_hash")
            else None
        )
        if source:
            page_count, chunk_count = _clone_from_existing(
                source_document_id=source["id"],
                new_document_id=document_id,
                user_id=user_id,
                filename=doc["filename"],
            )
            logger.info("Document %s reused embeddings from %s (identical content)", document_id, source["id"])
        else:
            page_count, chunk_count = _process_fresh(doc)

        db.update_document(
            document_id,
            status="ready",
            page_count=page_count,
            chunk_count=chunk_count,
            error_message=None,
        )
        logger.info("Processed document %s: %d chunks", document_id, chunk_count)

    except Exception as exc:  # noqa: BLE001 - intentionally broad; this is a background job boundary
        logger.exception("Failed to process document %s", document_id)
        db.update_document(document_id, status="failed", error_message=str(exc)[:500])


def _process_fresh(doc: dict) -> tuple[int | None, int]:
    document_id = doc["id"]
    user_id = doc["user_id"]
    path = Path(doc["storage_path"])

    if doc["type"] == "pdf":
        sections, page_count = load_pdf(path)
        if not sections:
            raise ValueError("Could not extract any text from this PDF (it may be scanned/image-only).")
        chunks = chunk_pdf_sections(sections)
    else:
        sections = load_markdown(path)
        if not sections:
            raise ValueError("This Markdown file appears to be empty.")
        chunks = chunk_markdown_sections(sections)
        page_count = None

    if not chunks:
        raise ValueError("No content survived chunking — the file may be empty.")

    _embed_and_store(document_id=document_id, user_id=user_id, filename=doc["filename"], chunks=chunks)
    return page_count, len(chunks)


def _embed_and_store(*, document_id: str, user_id: str, filename: str, chunks: list[Chunk]) -> None:
    embedder = get_embedding_service()
    chunk_rows = []

    for batch_start in range(0, len(chunks), _EMBED_BATCH_SIZE):
        batch = chunks[batch_start : batch_start + _EMBED_BATCH_SIZE]
        vectors = embedder.embed_documents([c.text for c in batch])

        ids, texts, metadatas = [], [], []
        for offset, (chunk, vector) in enumerate(zip(batch, vectors)):
            index = batch_start + offset
            chunk_id = f"{document_id}_chunk_{index}"
            ids.append(chunk_id)
            texts.append(chunk.text)
            metadatas.append(
                {
                    "document_id": document_id,
                    "user_id": user_id,
                    "filename": filename,
                    "chunk_id": chunk_id,
                    "chunk_index": index,
                    "source_type": "pdf" if chunk.page_number is not None else "markdown",
                    "page_number": chunk.page_number if chunk.page_number is not None else -1,
                    "heading": chunk.heading or "",
                }
            )
            chunk_rows.append(
                {
                    "id": chunk_id,
                    "document_id": document_id,
                    "user_id": user_id,
                    "chunk_index": index,
                    "page_number": chunk.page_number,
                    "heading": chunk.heading,
                    "char_count": len(chunk.text),
                }
            )

        vectorstore.add_chunks(ids=ids, embeddings=vectors, documents=texts, metadatas=metadatas)

    db.insert_chunk_rows(chunk_rows)


def _clone_from_existing(
    *, source_document_id: str, new_document_id: str, user_id: str, filename: str
) -> tuple[int | None, int]:
    source_chunks = vectorstore.get_all_chunks_with_embeddings(user_id=user_id, document_id=source_document_id)
    if not source_chunks:
        # Shouldn't happen (source is status='ready'), but fall back to a
        # normal run rather than leaving the document stuck.
        doc = db.get_document(new_document_id, user_id)
        return _process_fresh(doc)

    ids, embeddings, texts, metadatas = [], [], [], []
    chunk_rows = []
    page_numbers = set()

    for c in source_chunks:
        new_chunk_id = f"{new_document_id}_chunk_{c['metadata'].get('chunk_index', 0)}"
        ids.append(new_chunk_id)
        embeddings.append(c["embedding"])
        texts.append(c["text"])
        meta = {**c["metadata"], "document_id": new_document_id, "chunk_id": new_chunk_id, "filename": filename}
        metadatas.append(meta)
        page_number = c["metadata"].get("page_number", -1)
        if page_number and page_number > 0:
            page_numbers.add(page_number)
        chunk_rows.append(
            {
                "id": new_chunk_id,
                "document_id": new_document_id,
                "user_id": user_id,
                "chunk_index": c["metadata"].get("chunk_index", 0),
                "page_number": page_number if page_number > 0 else None,
                "heading": c["metadata"].get("heading") or None,
                "char_count": len(c["text"]),
            }
        )

    vectorstore.add_chunks(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
    db.insert_chunk_rows(chunk_rows)

    source_doc = db.get_document(source_document_id, user_id)
    page_count = source_doc.get("page_count") if source_doc else (max(page_numbers) if page_numbers else None)
    return page_count, len(source_chunks)

