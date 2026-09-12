"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PDFDocumentProxy } from "pdfjs-dist";

// react-pdf ships pdf.js but doesn't self-host the worker — pulling it from
// a CDN that matches the bundled version avoids fighting Next.js/webpack
// asset config for a binary worker file.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface PdfViewerHandle {
  /** Jump to a 1-indexed page, optionally highlighting the first match of `snippet` on it. */
  goToPage: (page: number, snippet?: string) => void;
}

interface SearchMatch {
  page: number;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export const PdfViewer = forwardRef<PdfViewerHandle, { fileUrl: string }>(function PdfViewer(
  { fileUrl },
  ref
) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1.1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  const pendingHighlight = useRef<string | null>(null);
  const docProxyRef = useRef<PDFDocumentProxy | null>(null);
  const pageTextCache = useRef<Map<number, string>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPageInput(String(pageNumber)), [pageNumber]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useImperativeHandle(ref, () => ({
    goToPage(page, snippet) {
      pendingHighlight.current = snippet ? normalize(snippet) : null;
      setPageNumber(Math.min(Math.max(page, 1), numPages || page));
    },
  }));

  async function getPageText(pageNum: number): Promise<string> {
    const cached = pageTextCache.current.get(pageNum);
    if (cached !== undefined) return cached;
    const doc = docProxyRef.current;
    if (!doc) return "";
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pageTextCache.current.set(pageNum, text);
    return text;
  }

  // Best-effort highlight: find rendered text-layer spans whose combined
  // text contains the snippet and flash a highlight background on them.
  const applyHighlight = useCallback((snippet: string) => {
    const wrapper = pageWrapperRef.current;
    if (!wrapper) return;
    const layer = wrapper.querySelector(".react-pdf__Page__textContent");
    if (!layer) return;
    const spans = Array.from(layer.querySelectorAll("span"));
    spans.forEach((s) => s.classList.remove("citation-highlight"));

    let combined = "";
    const ranges: { start: number; end: number; el: Element }[] = [];
    for (const span of spans) {
      const text = span.textContent ?? "";
      const start = combined.length;
      combined += text.toLowerCase() + " ";
      ranges.push({ start, end: combined.length, el: span });
    }

    const idx = combined.indexOf(snippet.slice(0, 80));
    if (idx === -1) return;
    const endIdx = idx + Math.min(snippet.length, 80);
    ranges
      .filter((r) => r.end > idx && r.start < endIdx)
      .forEach((r) => r.el.classList.add("citation-highlight"));

    const first = ranges.find((r) => r.end > idx);
    first?.el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const handleRenderSuccess = useCallback(() => {
    if (pendingHighlight.current) {
      // Text layer renders asynchronously right after the canvas; give it a tick.
      const snippet = pendingHighlight.current;
      pendingHighlight.current = null;
      setTimeout(() => applyHighlight(snippet), 120);
    }
  }, [applyHighlight]);

  const runSearch = useCallback(async () => {
    const q = normalize(searchQuery);
    if (!q || !docProxyRef.current) {
      setMatches([]);
      return;
    }
    setSearching(true);
    const found: SearchMatch[] = [];
    for (let p = 1; p <= numPages; p++) {
      const text = normalize(await getPageText(p));
      if (text.includes(q)) found.push({ page: p });
    }
    setMatches(found);
    setMatchIndex(0);
    setSearching(false);
    if (found.length > 0) {
      pendingHighlight.current = q;
      setPageNumber(found[0].page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, numPages]);

  const jumpToMatch = (delta: number) => {
    if (matches.length === 0) return;
    const next = (matchIndex + delta + matches.length) % matches.length;
    setMatchIndex(next);
    pendingHighlight.current = normalize(searchQuery);
    setPageNumber(matches[next].page);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const commitPageInput = () => {
    const n = Number(pageInput);
    if (Number.isFinite(n)) {
      setPageNumber(Math.min(Math.max(Math.round(n), 1), numPages || 1));
    } else {
      setPageInput(String(pageNumber));
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-2",
        isFullscreen && "bg-background p-4"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <button
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(e) => e.key === "Enter" && commitPageInput()}
            className="h-7 w-10 rounded border border-border bg-surface text-center text-text-primary"
          />
          <span>/ {numPages || "—"}</span>
        </div>
        <button
          onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          disabled={pageNumber >= numPages}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        <button
          onClick={() => setScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="w-10 text-center text-xs text-text-secondary">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale((s) => Math.min(3, +(s + 0.15).toFixed(2)))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2",
            searchOpen && "bg-brand-soft text-brand"
          )}
          aria-label="Search in document"
        >
          <Search className="h-4 w-4" />
        </button>

        <div className="flex-1" />

        <button
          onClick={toggleFullscreen}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search this document…"
            className="h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          <span className="whitespace-nowrap text-xs text-text-secondary">
            {searching ? "Searching…" : matches.length > 0 ? `${matchIndex + 1} / ${matches.length}` : "No matches"}
          </span>
          <button onClick={() => jumpToMatch(-1)} disabled={!matches.length} className="text-text-secondary disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => jumpToMatch(1)} disabled={!matches.length} className="text-text-secondary disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
              setMatches([]);
            }}
            className="text-text-secondary"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {loadError ? (
          <div className="flex h-full items-center justify-center text-sm text-danger">{loadError}</div>
        ) : (
          <div ref={pageWrapperRef} className="mx-auto w-fit">
            <Document
              file={fileUrl}
              loading={<div className="p-8 text-center text-sm text-text-secondary">Loading PDF…</div>}
              onLoadSuccess={(pdf) => {
                docProxyRef.current = pdf;
                setNumPages(pdf.numPages);
                setLoadError(null);
              }}
              onLoadError={(err) => setLoadError(err.message || "Could not load this PDF.")}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderAnnotationLayer={false}
                onRenderSuccess={handleRenderSuccess}
              />
            </Document>
          </div>
        )}
      </div>

      <style jsx global>{`
        .citation-highlight {
          background: color-mix(in srgb, var(--highlight) 55%, transparent);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
});
