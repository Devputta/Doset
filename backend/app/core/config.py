from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Auth — must match the frontend's SESSION_SECRET exactly.
    session_secret: str = "replace-with-a-long-random-string"

    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000"

    data_dir: str = "./data"
    chroma_persist_dir: str = "./data/chroma"
    # If set, connect to a standalone Chroma server (Docker Compose) instead
    # of the embedded on-disk client used for local dev.
    chroma_host: str | None = None
    chroma_port: int = 8001
    sqlite_path: str = "./data/app.db"
    max_file_size_mb: int = 25

    chunk_size_tokens: int = 800
    chunk_overlap_tokens: int = 120

    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"

    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    retrieval_top_k: int = 5

    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    gemini_api_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    # ~4 characters per token is a common rough estimate for English text and
    # is good enough for sizing chunks without pulling in a tokenizer.
    @property
    def chunk_size_chars(self) -> int:
        return self.chunk_size_tokens * 4

    @property
    def chunk_overlap_chars(self) -> int:
        return self.chunk_overlap_tokens * 4


settings = Settings()

# Ensure storage directories exist as soon as settings are imported.
Path(settings.data_dir).mkdir(parents=True, exist_ok=True)
Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
Path(settings.sqlite_path).parent.mkdir(parents=True, exist_ok=True)
