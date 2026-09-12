"""
A single Chroma collection holds every user's chunks. Isolation is enforced
with a metadata filter on every read and write — `user_id` is always part of
the `where` clause, so one user's query can never match another user's
chunks even if they somehow guessed a document_id. (For much larger
multi-tenant deployments you'd likely give each user their own collection
instead; a single filtered collection is the simpler, cheaper choice that
fits a personal project.)
"""

import chromadb

from app.core.config import settings

_client: chromadb.ClientAPI | None = None
_COLLECTION_NAME = "document_chunks"


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        # In Docker Compose, Chroma runs as its own service and CHROMA_HOST is
        # set — connect to it over HTTP. Locally (no CHROMA_HOST), fall back to
        # an embedded on-disk client. Either way, every other function in this
        # module is unaffected.
        if settings.chroma_host:
            _client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
        else:
            _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _client


def _get_collection():
    return _get_client().get_or_create_collection(_COLLECTION_NAME)


def add_chunks(
    *,
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    if not ids:
        return
    _get_collection().add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)


def query(
    *, query_embedding: list[float], user_id: str, document_id: str, top_k: int
) -> list[dict]:
    result = _get_collection().query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"$and": [{"user_id": user_id}, {"document_id": document_id}]},
    )
    if not result["ids"] or not result["ids"][0]:
        return []

    out = []
    for i in range(len(result["ids"][0])):
        distance = result["distances"][0][i]
        # Chroma's default space is squared L2 on OpenAI's normalized
        # embeddings; convert to a 0..1 "relevance" score that's intuitive
        # to show in the UI (1 = closest, 0 = far).
        relevance = max(0.0, 1.0 - distance / 2.0)
        out.append(
            {
                "chunk_id": result["ids"][0][i],
                "text": result["documents"][0][i],
                "metadata": result["metadatas"][0][i],
                "relevance_score": round(relevance, 4),
            }
        )
    return out


def delete_document_chunks(*, user_id: str, document_id: str) -> None:
    _get_collection().delete(where={"$and": [{"user_id": user_id}, {"document_id": document_id}]})


def get_document_chunks(*, user_id: str, document_id: str, limit: int = 5) -> list[dict]:
    """Used for suggested-question generation — grabs a handful of chunks
    (in original chunk order) rather than a full semantic query."""
    result = _get_collection().get(
        where={"$and": [{"user_id": user_id}, {"document_id": document_id}]},
        limit=limit,
    )
    chunks = list(zip(result["ids"], result["documents"], result["metadatas"]))
    chunks.sort(key=lambda c: c[2].get("chunk_index", 0))
    return [{"chunk_id": c[0], "text": c[1], "metadata": c[2]} for c in chunks]


def get_all_chunks_with_embeddings(*, user_id: str, document_id: str) -> list[dict]:
    """Used to clone an identical document's chunks without recomputing
    embeddings (Day 7 perf: dedup on content hash)."""
    result = _get_collection().get(
        where={"$and": [{"user_id": user_id}, {"document_id": document_id}]},
        include=["embeddings", "documents", "metadatas"],
    )
    chunks = list(zip(result["ids"], result["embeddings"], result["documents"], result["metadatas"]))
    chunks.sort(key=lambda c: c[3].get("chunk_index", 0))
    return [
        {"chunk_id": c[0], "embedding": list(c[1]), "text": c[2], "metadata": c[3]} for c in chunks
    ]
