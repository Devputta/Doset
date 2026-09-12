"""Same pattern as embeddings.py: one small interface, a provider per class."""

from abc import ABC, abstractmethod
from typing import Iterator

from app.core.config import settings


class LLMService(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str, *, max_tokens: int = 800) -> str: ...

    @abstractmethod
    def generate_stream(
        self, system_prompt: str, user_prompt: str, *, max_tokens: int = 800
    ) -> Iterator[str]:
        """Yields answer text incrementally, in small pieces, for SSE streaming."""
        ...


class OpenAILLMService(LLMService):
    def __init__(self, model: str, api_key: str):
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key)
        self._model = model

    def generate(self, system_prompt: str, user_prompt: str, *, max_tokens: int = 800) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            max_tokens=max_tokens,
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()

    def generate_stream(
        self, system_prompt: str, user_prompt: str, *, max_tokens: int = 800
    ) -> Iterator[str]:
        stream = self._client.chat.completions.create(
            model=self._model,
            max_tokens=max_tokens,
            temperature=0.2,
            stream=True,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        for event in stream:
            delta = event.choices[0].delta.content if event.choices else None
            if delta:
                yield delta


class AnthropicLLMService(LLMService):
    def __init__(self, model: str, api_key: str):
        from anthropic import Anthropic

        self._client = Anthropic(api_key=api_key)
        self._model = model

    def generate(self, system_prompt: str, user_prompt: str, *, max_tokens: int = 800) -> str:
        response = self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            temperature=0.2,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(block.text for block in response.content if block.type == "text").strip()

    def generate_stream(
        self, system_prompt: str, user_prompt: str, *, max_tokens: int = 800
    ) -> Iterator[str]:
        with self._client.messages.stream(
            model=self._model,
            max_tokens=max_tokens,
            temperature=0.2,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text


class GeminiLLMService(LLMService):
    """Google's Gemini API — the one provider here with a genuine free tier
    (no credit card required). See backend/README.md for setup."""

    def __init__(self, model: str, api_key: str):
        from google import genai

        self._client = genai.Client(api_key=api_key)
        self._model = model

    def generate(self, system_prompt: str, user_prompt: str, *, max_tokens: int = 800) -> str:
        from google.genai import types

        response = self._client.models.generate_content(
            model=self._model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=max_tokens,
                temperature=0.2,
            ),
        )
        return (response.text or "").strip()

    def generate_stream(
        self, system_prompt: str, user_prompt: str, *, max_tokens: int = 800
    ) -> Iterator[str]:
        from google.genai import types

        stream = self._client.models.generate_content_stream(
            model=self._model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=max_tokens,
                temperature=0.2,
            ),
        )
        for chunk in stream:
            if chunk.text:
                yield chunk.text


_instance: LLMService | None = None


def get_llm_service() -> LLMService:
    global _instance
    if _instance is not None:
        return _instance

    provider = settings.llm_provider.lower()
    if provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("LLM_PROVIDER=openai requires OPENAI_API_KEY to be set in backend/.env")
        _instance = OpenAILLMService(settings.llm_model, settings.openai_api_key)
    elif provider == "anthropic":
        if not settings.anthropic_api_key:
            raise RuntimeError("LLM_PROVIDER=anthropic requires ANTHROPIC_API_KEY to be set in backend/.env")
        _instance = AnthropicLLMService(settings.llm_model, settings.anthropic_api_key)
    elif provider == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError("LLM_PROVIDER=gemini requires GEMINI_API_KEY to be set in backend/.env")
        _instance = GeminiLLMService(settings.llm_model, settings.gemini_api_key)
    else:
        raise RuntimeError(
            f"Unsupported LLM_PROVIDER '{provider}'. Add a new LLMService subclass "
            "in app/rag/llm.py and register it here."
        )
    return _instance
