"""
Loaders turn a raw file on disk into a list of "sections" — the smallest
unit we know how to attach real metadata to (a PDF page, a Markdown
heading's worth of content). Chunking (chunking.py) then splits each
section further only if it's too long, and every resulting chunk inherits
its section's metadata (page number, or heading).
"""

import re
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader


@dataclass
class PdfSection:
    page_number: int  # 1-indexed
    text: str


@dataclass
class MarkdownSection:
    heading: str | None
    heading_level: int
    text: str


def load_pdf(path: Path) -> tuple[list[PdfSection], int]:
    reader = PdfReader(str(path))
    sections: list[PdfSection] = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            sections.append(PdfSection(page_number=i, text=text))
    return sections, len(reader.pages)


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$", re.MULTILINE)


def load_markdown(path: Path) -> list[MarkdownSection]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    matches = list(_HEADING_RE.finditer(raw))

    if not matches:
        return [MarkdownSection(heading=None, heading_level=0, text=raw.strip())] if raw.strip() else []

    sections: list[MarkdownSection] = []

    # Any content before the first heading becomes its own untitled section.
    if matches[0].start() > 0:
        preamble = raw[: matches[0].start()].strip()
        if preamble:
            sections.append(MarkdownSection(heading=None, heading_level=0, text=preamble))

    for idx, match in enumerate(matches):
        level = len(match.group(1))
        heading = match.group(2).strip()
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(raw)
        body = raw[start:end].strip()
        # Keep the heading itself in the section text so embeddings/answers
        # retain the "what section is this" context even after chunking.
        text = f"{'#' * level} {heading}\n\n{body}".strip()
        sections.append(MarkdownSection(heading=heading, heading_level=level, text=text))

    return sections
