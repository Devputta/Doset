# Docent backend — FastAPI + LangChain + ChromaDB

RAG backend for the Docent document assistant. Handles document processing
(extraction → chunking → embeddings → vector storage) and retrieval-augmented
chat. See the root `INSTALL.md` for setup; this file covers architecture
decisions.

## Module layout

```
app/
  main.py                FastAPI app, CORS, router registration, startup DB init
  core/
    config.py             Settings loaded from environment variables (pydantic-settings)
    security.py            Verifies the frontend's session JWT (shared SESSION_SECRET)
  models/
    db.py                  SQLite access — documents, conversations, messages
    schemas.py              Pydantic request/response models
  api/
    deps.py                 get_current_user dependency (Bearer token -> CurrentUser)
    documents.py             /api/documents/* routes
    chat.py                  /api/chat* routes
  services/
    storage.py               Save/stream/delete original files on disk
    document_service.py       Upload validation + document CRUD orchestration
  rag/
    loaders.py                PDF (per-page) / Markdown (per-heading) text extraction
    chunking.py                Configurable, semantic-aware chunk splitting
    embeddings.py               EmbeddingService abstraction (OpenAI today)
    llm.py                      LLMService abstraction (OpenAI or Anthropic)
    vectorstore.py               ChromaDB wrapper with per-user metadata isolation
    pipeline.py                  Orchestrates extraction -> chunking -> embedding -> storage
    retrieval.py                  Retrieval + anti-hallucination answer generation
    suggestions.py                 Suggested-question generation, with a static fallback
```

## Auth: no second login system

The backend never issues its own sessions. The frontend signs a JWT on
login (`doc-assistant/src/lib/auth/session.ts`) with `SESSION_SECRET`; every
Next.js `/api/documents/*` and `/api/chat*` route reads that same token from
the httpOnly cookie and forwards it as a `Bearer` header. The backend just
verifies the signature with the same secret (`core/security.py`) — so it
never has to trust Next.js, it trusts the token, the same way it would if a
browser called it directly. **`SESSION_SECRET` must be identical in both
`doc-assistant/.env.local` and `backend/.env`.**

## Storage choices (and how to grow past them)

- **Metadata: SQLite**, not Postgres. Every access goes through `models/db.py`,
  so swapping to Postgres later is a change to that one file's connection
  handling and SQL dialect — not to any caller.
- **Vectors: a single Chroma collection**, isolated per user/document via a
  `where={"user_id": ..., "document_id": ...}` filter on every read and
  write (`rag/vectorstore.py`). Simpler and cheaper than one collection per
  user for a portfolio-scale deployment; swap to Pinecone by replacing this
  module — `pipeline.py` and `retrieval.py` only call its four functions.
- **Files: local disk** under `DATA_DIR/documents/<user_id>/<document_id>/`.
  Swap for S3/GCS by replacing `services/storage.py`.

## Processing pipeline

Upload returns immediately with `status="uploaded"` (bytes saved, not yet
processed) and kicks off `rag/pipeline.py:process_document` as a FastAPI
`BackgroundTask`. The document's status only ever becomes `"ready"` after
extraction, chunking, embedding, and ChromaDB storage have all actually
succeeded — if anything fails, it becomes `"failed"` with `error_message`
set, never a false `"ready"`.

Chunking uses `langchain_text_splitters.RecursiveCharacterTextSplitter`,
which tries paragraph breaks, then sentences, then words before ever cutting
mid-word — configurable via `CHUNK_SIZE_TOKENS` / `CHUNK_OVERLAP_TOKENS`
(converted to characters at ~4 chars/token). PDF chunks never cross a page
boundary, so every chunk's page number is exact, not interpolated. Markdown
chunks carry their nearest heading instead.

## Anti-hallucination

`rag/retrieval.py`'s system prompt instructs the model to answer only from
the retrieved excerpts, cite every claim inline (`[Page 12]` / `[Heading]`),
and explicitly say when the document doesn't contain enough information —
never fall back to outside knowledge. If retrieval returns zero matches, the
backend skips the LLM call entirely and returns the "not enough information"
message directly, so an empty result can't be quietly hallucinated over.

## Providers

Three LLM providers ship today: `openai`, `anthropic`, and `gemini`. Two
embedding providers: `openai` and `gemini`. Set `LLM_PROVIDER` /
`EMBEDDING_PROVIDER` in `.env` to pick, and only fill in the matching API
key. **Gemini is the one with a genuine free tier** (no credit card) — see
the comment block in `.env.example` for the exact settings to run this
project at $0. One caveat: don't switch `EMBEDDING_PROVIDER` after you've
already processed documents — different providers produce different vector
dimensions/spaces, and this project uses one shared Chroma collection, so
mixing providers mid-project will break retrieval for anything embedded
under the old provider. Delete `data/chroma` (or re-upload) if you switch.

## Extending providers

Both `rag/embeddings.py` and `rag/llm.py` are one-abstract-class-plus-factory.
Adding a new provider (a local embedding model, a different LLM vendor) means
writing one new class and adding one line to that file's factory function —
`pipeline.py` and `retrieval.py` never change.
