/**
 * Client-safe config. Only NEXT_PUBLIC_* values may live here — anything
 * secret (API_BASE_URL, SESSION_SECRET, provider API keys) stays server-side
 * and is read directly from process.env inside route handlers.
 */

export const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 25);
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".pdf", ".md", ".markdown"] as const;

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "text/markdown",
  "text/x-markdown",
  "text/plain", // some browsers/OSes report .md as text/plain
] as const;

export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function fileExtensionType(filename: string): "pdf" | "markdown" | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}
