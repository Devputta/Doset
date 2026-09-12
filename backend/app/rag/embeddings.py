"""
Embeddings are behind a small interface so a new provider is a new class,
not a rewrite of the pipeline or retrieval code. Adding another provider
means implementing `EmbeddingService` and registering it in
`get_embedding_service()` — nothing else changes.
"""

from abc import ABC, abstractmethod

from app.core.config import settings


class EmbeddingService(ABC):
    @abstractmethod
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    @abstractmethod
    def embed_query(self, text: str) -> list[float]: ...


class OpenAIEmbeddingService(EmbeddingService):
    def __init__(self, model: str, api_key: str):
        from langchain_openai import OpenAIEmbeddings

        self._client = OpenAIEmbeddings(model=model, api_key=api_key)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._client.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._client.embed_query(text)


class GeminiEmbeddingService(EmbeddingService):
    """Google's Gemini embeddings — free tier, no credit card required.
    Uses asymmetric task types (RETRIEVAL_DOCUMENT vs RETRIEVAL_QUERY), which
    Google's docs recommend for meaningfully better retrieval quality than
    embedding both sides the same way."""

    # The free tier's per-request batch cap is modest; keep requests small
    # regardless of pipeline.py's own batch size.
    _BATCH_SIZE = 20

    def __init__(self, model: str, api_key: str):
        from google import genai

        self._client = genai.Client(api_key=api_key)
        self._model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        from google.genai import types

        vectors: list[list[float]] = []
        for i in range(0, len(texts), self._BATCH_SIZE):
            batch = texts[i : i + self._BATCH_SIZE]
            response = self._client.models.embed_content(
                model=self._model,
                contents=batch,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
            )
            vectors.extend(e.values for e in response.embeddings)
        return vectors

    def embed_query(self, text: str) -> list[float]:
        from google.genai import types

        response = self._client.models.embed_content(
            model=self._model,
            contents=[text],
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
        )
        return response.embeddings[0].values


_instance: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _instance
    if _instance is not None:
        return _instance

    provider = settings.embedding_provider.lower()
    if provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError(
                "EMBEDDING_PROVIDER=openai requires OPENAI_API_KEY to be set in backend/.env"
            )
        _instance = OpenAIEmbeddingService(settings.embedding_model, settings.openai_api_key)
    elif provider == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError(
                "EMBEDDING_PROVIDER=gemini requires GEMINI_API_KEY to be set in backend/.env"
            )
        _instance = GeminiEmbeddingService(settings.embedding_model, settings.gemini_api_key)
    else:
        raise RuntimeError(
            f"Unsupported EMBEDDING_PROVIDER '{provider}'. Add a new EmbeddingService "
            "subclass in app/rag/embeddings.py and register it here."
        )
    return _instance
