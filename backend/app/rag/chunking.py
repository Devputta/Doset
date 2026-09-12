from dataclasses import dataclass, field

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.rag.loaders import MarkdownSection, PdfSection


@dataclass
class Chunk:
    text: str
    page_number: int | None = None
    heading: str | None = None
    extra_metadata: dict = field(default_factory=dict)


def _splitter() -> RecursiveCharacterTextSplitter:
    # Recursive splitting tries paragraph breaks, then sentences, then words,
    # before ever falling back to a hard character cut — the "don't blindly
    # split in the middle of meaningful content" requirement.
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size_chars,
        chunk_overlap=settings.chunk_overlap_chars,
        separators=["\n\n", "\n", ". ", " ", ""],
    )


def chunk_pdf_sections(sections: list[PdfSection]) -> list[Chunk]:
    splitter = _splitter()
    chunks: list[Chunk] = []
    for section in sections:
        for piece in splitter.split_text(section.text):
            chunks.append(Chunk(text=piece, page_number=section.page_number))
    return chunks


def chunk_markdown_sections(sections: list[MarkdownSection]) -> list[Chunk]:
    splitter = _splitter()
    chunks: list[Chunk] = []
    for section in sections:
        for piece in splitter.split_text(section.text):
            chunks.append(Chunk(text=piece, heading=section.heading))
    return chunks
