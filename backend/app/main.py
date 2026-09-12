import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import account, chat, documents
from app.core.config import settings
from app.core.middleware import InMemoryRateLimitMiddleware, RequestIDMiddleware
from app.models.db import get_conn, init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s level=%(levelname)s logger=%(name)s msg=%(message)s",
)
logger = logging.getLogger("doc_assistant.main")

app = FastAPI(
    title="Context-Aware AI Document Assistant API",
    description=(
        "RAG backend for the Docent document assistant: document upload/processing, "
        "ChromaDB-backed retrieval, and grounded, cited chat — including streaming responses."
    ),
    version="0.7.0",
)

# Order matters: rate limiting first (reject before doing any real work),
# then request-ID/logging around everything else.
app.add_middleware(InMemoryRateLimitMiddleware, max_requests=120, window_seconds=60)
app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Global exception handling — never leak stack traces, internal paths, or
# provider API keys to the client. Full details still go to the server log
# (with the request ID for correlation), just not into the response body.
# --------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "http_error", "message": exc.detail, "requestId": request_id},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": "Invalid request.",
            "details": exc.errors(),
            "requestId": request_id,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.exception("Unhandled exception [%s]", request_id)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "Something went wrong on our end. Please try again.",
            "requestId": request_id,
        },
    )


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    logger.info("Database ready at %s", settings.sqlite_path)
    logger.info(
        "Chroma: %s",
        f"http://{settings.chroma_host}:{settings.chroma_port}"
        if settings.chroma_host
        else settings.chroma_persist_dir,
    )
    logger.info("Embedding provider: %s (%s)", settings.embedding_provider, settings.embedding_model)
    logger.info("LLM provider: %s (%s)", settings.llm_provider, settings.llm_model)


@app.get("/health")
async def health():
    """Reports the health of every dependency the app needs — without
    leaking configuration values (no keys, no hostnames, no file paths)."""
    checks = {}

    try:
        with get_conn() as conn:
            conn.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception:  # noqa: BLE001
        checks["database"] = "error"

    try:
        from app.rag.vectorstore import _get_client  # local import avoids a hard dep at module load

        _get_client().heartbeat()
        checks["vector_store"] = "ok"
    except Exception:  # noqa: BLE001
        checks["vector_store"] = "error"

    checks["llm_configured"] = "ok" if _provider_key_present(settings.llm_provider) else "missing_api_key"
    checks["embedding_configured"] = (
        "ok" if _provider_key_present(settings.embedding_provider) else "missing_api_key"
    )

    overall_ok = all(v == "ok" for v in checks.values())
    return JSONResponse(
        status_code=200 if overall_ok else 503,
        content={"status": "ok" if overall_ok else "degraded", "checks": checks},
    )


def _provider_key_present(provider: str) -> bool:
    if provider == "openai":
        return bool(settings.openai_api_key)
    if provider == "anthropic":
        return bool(settings.anthropic_api_key)
    if provider == "gemini":
        return bool(settings.gemini_api_key)
    return False


app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(account.router)
