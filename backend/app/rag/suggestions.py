import json
import logging

from app.models import db
from app.rag import vectorstore
from app.rag.llm import get_llm_service

logger = logging.getLogger("doc_assistant.suggestions")

FALLBACK_QUESTIONS = [
    "What is this document about?",
    "Summarize the main points.",
    "What are the important requirements?",
    "Explain this section in simple terms.",
]

_SYSTEM_PROMPT = (
    "You suggest short, useful questions a reader could ask about a document, based only on the "
    "excerpt provided. Return ONLY a JSON array of 4 short question strings — no prose, no markdown "
    "fences, nothing else."
)


def get_suggested_questions(*, document_id: str, user_id: str) -> list[str]:
    doc = db.get_document(document_id, user_id)
    if not doc:
        return FALLBACK_QUESTIONS

    # Cached after first generation so opening a document repeatedly doesn't
    # re-spend an LLM call every time.
    if doc.get("suggested_questions"):
        try:
            cached = json.loads(doc["suggested_questions"])
            if cached:
                return cached
        except (json.JSONDecodeError, TypeError):
            pass

    if doc["status"] != "ready":
        return FALLBACK_QUESTIONS

    try:
        chunks = vectorstore.get_document_chunks(user_id=user_id, document_id=document_id, limit=4)
        if not chunks:
            return FALLBACK_QUESTIONS

        excerpt = "\n\n".join(c["text"] for c in chunks)[:6000]
        llm = get_llm_service()
        raw = llm.generate(_SYSTEM_PROMPT, f"Document excerpt:\n\n{excerpt}", max_tokens=300)
        questions = json.loads(raw)
        if not isinstance(questions, list) or not all(isinstance(q, str) for q in questions):
            raise ValueError("Model did not return a JSON array of strings")
        questions = questions[:4] or FALLBACK_QUESTIONS

        db.update_document(document_id, suggested_questions=json.dumps(questions))
        return questions

    except Exception:  # noqa: BLE001 — suggestions are a nice-to-have, never break the page over them
        logger.warning("Falling back to static suggested questions for %s", document_id, exc_info=True)
        return FALLBACK_QUESTIONS
