import hashlib
import shutil
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings


class FileTooLargeError(Exception):
    pass


def document_dir(user_id: str, document_id: str) -> Path:
    return Path(settings.data_dir) / "documents" / user_id / document_id


async def save_upload(user_id: str, document_id: str, upload: UploadFile, extension: str) -> tuple[Path, int, str]:
    """Streams the upload to disk in chunks, enforcing MAX_FILE_SIZE_MB as it goes
    (rather than trusting a Content-Length header, which callers can lie about).
    Also hashes the content as it streams so callers can dedupe without a second
    read of the file (Day 7 perf: skip re-embedding identical uploads)."""
    directory = document_dir(user_id, document_id)
    directory.mkdir(parents=True, exist_ok=True)
    dest = directory / f"original{extension}"

    size = 0
    hasher = hashlib.sha256()
    chunk_size = 1024 * 1024
    with dest.open("wb") as out:
        while True:
            chunk = await upload.read(chunk_size)
            if not chunk:
                break
            size += len(chunk)
            if size > settings.max_file_size_bytes:
                out.close()
                shutil.rmtree(directory, ignore_errors=True)
                raise FileTooLargeError(
                    f"File exceeds the {settings.max_file_size_mb} MB limit."
                )
            hasher.update(chunk)
            out.write(chunk)

    return dest, size, hasher.hexdigest()


def delete_document_files(user_id: str, document_id: str) -> None:
    shutil.rmtree(document_dir(user_id, document_id), ignore_errors=True)


def content_type_for(extension: str) -> str:
    return {
        ".pdf": "application/pdf",
        ".md": "text/markdown; charset=utf-8",
        ".markdown": "text/markdown; charset=utf-8",
    }.get(extension, "application/octet-stream")
