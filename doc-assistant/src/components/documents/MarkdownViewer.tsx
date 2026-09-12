"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { cn } from "@/lib/utils";

export interface MarkdownViewerHandle {
  /** Scroll to (and briefly flash) the heading whose text best matches `heading`. */
  scrollToHeading: (heading: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export const MarkdownViewer = forwardRef<MarkdownViewerHandle, { content: string }>(
  function MarkdownViewer({ content }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [flashedId, setFlashedId] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      scrollToHeading(heading: string) {
        const root = containerRef.current;
        if (!root) return;
        const target = normalize(heading);
        const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));

        let best: Element | null = null;
        // Prefer an exact slug match, fall back to substring match either way.
        best =
          headings.find((h) => h.id === slugify(heading)) ??
          headings.find((h) => normalize(h.textContent ?? "").includes(target)) ??
          headings.find((h) => target.includes(normalize(h.textContent ?? "")) && h.textContent) ??
          null;

        if (best) {
          best.scrollIntoView({ behavior: "smooth", block: "start" });
          setFlashedId(best.id);
          setTimeout(() => setFlashedId(null), 1800);
        }
      },
    }));

    return (
      <div ref={containerRef} className="h-full overflow-auto rounded-lg border border-border bg-surface p-6">
        <article className="prose-doc max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug, rehypeSanitize]}
            components={{
              h1: (props) => <HeadingWithFlash as="h1" flashed={flashedId} {...props} />,
              h2: (props) => <HeadingWithFlash as="h2" flashed={flashedId} {...props} />,
              h3: (props) => <HeadingWithFlash as="h3" flashed={flashedId} {...props} />,
              h4: (props) => <HeadingWithFlash as="h4" flashed={flashedId} {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    );
  }
);

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function HeadingWithFlash({
  as: Tag,
  flashed,
  id,
  children,
  ...rest
}: {
  as: "h1" | "h2" | "h3" | "h4";
  flashed: string | null;
  id?: string;
  children?: ReactNode;
}) {
  return (
    <Tag
      id={id}
      className={cn("scroll-mt-4 transition-colors duration-300", flashed === id && "bg-highlight-soft rounded px-1")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
