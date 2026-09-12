"""
Metadata (documents, conversations, messages) lives in SQLite — plenty for a
personal-portfolio-scale deployment, and every access goes through this
module's functions so swapping in Postgres later (per the README's "simpler
and cheaper, ready to grow" note) means changing this file only, not every
caller.

Vector embeddings live separately, in ChromaDB (see rag/vectorstore.py).
"""

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from app.core.config import settings


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_conn():
    conn = sqlite3.connect(settings.sqlite_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                filename TEXT NOT NULL,
                type TEXT NOT NULL,                 -- 'pdf' | 'markdown'
                status TEXT NOT NULL,                -- 'uploaded' | 'processing' | 'ready' | 'failed'
                storage_path TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                page_count INTEGER,
                chunk_count INTEGER,
                error_message TEXT,
                suggested_questions TEXT,            -- cached JSON array
                content_hash TEXT,                   -- sha256 of the file, for dedup (Day 7 perf)
                uploaded_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
            CREATE INDEX IF NOT EXISTS idx_documents_user_hash ON documents(user_id, content_hash);

            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL,
                title TEXT,                          -- auto-generated from the first question
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_conversations_document ON conversations(document_id);
            CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                role TEXT NOT NULL,                  -- 'user' | 'assistant'
                content TEXT NOT NULL,
                citations TEXT,                      -- JSON array, assistant messages only
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

            -- Metadata mirror of what's embedded in ChromaDB. Chroma remains the
            -- source of truth for vectors/text; this table exists so the app has
            -- a real "DocumentChunk" entity for referential integrity, cascading
            -- deletes, and any future UI (e.g. a chunk inspector) without a round
            -- trip to Chroma for simple bookkeeping.
            CREATE TABLE IF NOT EXISTS document_chunks (
                id TEXT PRIMARY KEY,                 -- matches the Chroma chunk id
                document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                page_number INTEGER,
                heading TEXT,
                char_count INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
            """
        )


# --------------------------------------------------------------------------
# Documents
# --------------------------------------------------------------------------

def create_document(
    *,
    id: str,
    user_id: str,
    title: str,
    filename: str,
    type: str,
    storage_path: str,
    size_bytes: int,
    content_hash: str | None = None,
) -> dict:
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO documents
               (id, user_id, title, filename, type, status, storage_path, size_bytes, content_hash, uploaded_at)
               VALUES (?, ?, ?, ?, ?, 'uploaded', ?, ?, ?, ?)""",
            (id, user_id, title, filename, type, storage_path, size_bytes, content_hash, now),
        )
    return get_document(id, user_id)


def find_ready_document_by_hash(user_id: str, content_hash: str, exclude_id: str) -> dict | None:
    """Used to skip re-embedding identical content the same user already uploaded (Day 7 perf)."""
    with get_conn() as conn:
        row = conn.execute(
            """SELECT * FROM documents
               WHERE user_id = ? AND content_hash = ? AND status = 'ready' AND id != ?
               ORDER BY uploaded_at DESC LIMIT 1""",
            (user_id, content_hash, exclude_id),
        ).fetchone()
    return dict(row) if row else None


def list_documents(user_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC", (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def get_document(document_id: str, user_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?", (document_id, user_id)
        ).fetchone()
    return dict(row) if row else None


def update_document(document_id: str, **fields) -> None:
    if not fields:
        return
    columns = ", ".join(f"{k} = ?" for k in fields)
    with get_conn() as conn:
        conn.execute(f"UPDATE documents SET {columns} WHERE id = ?", (*fields.values(), document_id))


def delete_document_row(document_id: str, user_id: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM documents WHERE id = ? AND user_id = ?", (document_id, user_id))


# --------------------------------------------------------------------------
# Document chunks (metadata mirror — see schema comment above)
# --------------------------------------------------------------------------

def insert_chunk_rows(rows: list[dict]) -> None:
    if not rows:
        return
    with get_conn() as conn:
        conn.executemany(
            """INSERT INTO document_chunks (id, document_id, user_id, chunk_index, page_number, heading, char_count)
               VALUES (:id, :document_id, :user_id, :chunk_index, :page_number, :heading, :char_count)""",
            rows,
        )


# --------------------------------------------------------------------------
# Conversations & messages
# --------------------------------------------------------------------------

def list_all_conversations(user_id: str, search: str | None = None) -> list[dict]:
    """Cross-document conversation list for the Chat History page (Day 6),
    with optional full-text-ish search across title, document name, and
    message content."""
    query = """
        SELECT c.*, d.title AS document_title,
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
               (SELECT content FROM messages m WHERE m.conversation_id = c.id
                  ORDER BY m.created_at DESC LIMIT 1) AS last_message
        FROM conversations c
        JOIN documents d ON d.id = c.document_id
        WHERE c.user_id = ?
    """
    params: list = [user_id]

    if search:
        query += """
            AND (
                c.title LIKE ?
                OR d.title LIKE ?
                OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE ?)
            )
        """
        like = f"%{search}%"
        params.extend([like, like, like])

    query += " ORDER BY c.updated_at DESC"

    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def rename_conversation(conversation_id: str, user_id: str, title: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (title, _now(), conversation_id, user_id),
        )

def create_conversation(*, id: str, document_id: str, user_id: str, title: str | None = None) -> dict:
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO conversations (id, document_id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (id, document_id, user_id, title, now, now),
        )
    return {
        "id": id,
        "document_id": document_id,
        "user_id": user_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
    }


def get_conversation(conversation_id: str, user_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id)
        ).fetchone()
    return dict(row) if row else None


def touch_conversation(conversation_id: str) -> None:
    with get_conn() as conn:
        conn.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (_now(), conversation_id))


def delete_conversation(conversation_id: str, user_id: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))


def list_conversations(document_id: str, user_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT c.*,
                      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
                      (SELECT content FROM messages m WHERE m.conversation_id = c.id
                         ORDER BY m.created_at ASC LIMIT 1) AS preview
               FROM conversations c
               WHERE c.document_id = ? AND c.user_id = ?
               ORDER BY c.updated_at DESC""",
            (document_id, user_id),
        ).fetchall()
    return [dict(r) for r in rows]


def add_message(
    *, id: str, conversation_id: str, role: str, content: str, citations: list[dict] | None = None
) -> dict:
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, citations, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (id, conversation_id, role, content, json.dumps(citations) if citations else None, now),
        )
    return {"id": id, "role": role, "content": content, "citations": citations, "created_at": now}


def list_messages(conversation_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conversation_id,)
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["citations"] = json.loads(d["citations"]) if d["citations"] else []
        result.append(d)
    return result


# --------------------------------------------------------------------------
# Account summary (Day 6 storage dashboard)
# --------------------------------------------------------------------------

def account_summary(user_id: str) -> dict:
    with get_conn() as conn:
        doc_row = conn.execute(
            """SELECT COUNT(*) AS count,
                      COALESCE(SUM(size_bytes), 0) AS bytes
               FROM documents WHERE user_id = ?""",
            (user_id,),
        ).fetchone()
        conv_count = conn.execute(
            "SELECT COUNT(*) AS count FROM conversations WHERE user_id = ?", (user_id,)
        ).fetchone()["count"]
        status_rows = conn.execute(
            "SELECT status, COUNT(*) AS count FROM documents WHERE user_id = ? GROUP BY status", (user_id,)
        ).fetchall()

    return {
        "document_count": doc_row["count"],
        "conversation_count": conv_count,
        "storage_used_bytes": doc_row["bytes"],
        "status_breakdown": {r["status"]: r["count"] for r in status_rows},
    }
