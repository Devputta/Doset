import { StaticPage } from "@/components/layout/StaticPage";

export const metadata = {
  title: "Documentation — Docent",
  description: "How the Documents feature works: upload, processing, the viewer, and chat.",
};

export default function DocsPage() {
  return (
    <StaticPage
      eyebrow="Documentation"
      title="Using Documents"
      description="How uploading, processing, viewing, and chatting with a document actually works."
    >
      <h2>Supported files</h2>
      <p>
        PDF (<code>.pdf</code>) and Markdown (<code>.md</code>, <code>.markdown</code>). Each file
        has a maximum size, shown on the upload screen — configurable by whoever is running the
        backend (25 MB by default).
      </p>

      <h2>Uploading</h2>
      <p>
        From <strong>Documents</strong>, drag a file into the upload area or click to browse. You can
        queue multiple files, cancel one mid-upload, or retry one that failed. Once the bytes are
        saved, the document appears in your list immediately with status <strong>Uploaded</strong>.
      </p>

      <h2>Processing</h2>
      <p>A document moves through a few states after upload, and the UI never claims a later state than what&apos;s actually true:</p>
      <ul>
        <li><strong>Uploaded</strong> — the file is saved, processing hasn&apos;t started yet</li>
        <li><strong>Processing</strong> — text is being extracted, split into chunks, and embedded</li>
        <li><strong>Ready</strong> — you can open the viewer and start chatting</li>
        <li><strong>Failed</strong> — something went wrong; the document card shows why (e.g. a scanned, image-only PDF with no extractable text)</li>
      </ul>
      <p>
        Processing usually takes a few seconds for a short document. The Documents page polls
        automatically, so you don&apos;t need to refresh.
      </p>

      <h2>The viewer</h2>
      <p>
        Opening a ready document splits the screen: the document on one side, chat on the other
        (stacked as tabs on mobile). PDFs render with real page navigation, zoom, in-document
        search, and fullscreen. Markdown renders safely (no raw HTML/script execution) with
        headings, lists, tables, and code blocks.
      </p>

      <h2>Chatting and citations</h2>
      <p>
        Ask a question and the answer streams in as it&apos;s generated. Every answer is grounded
        only in that document&apos;s content — if the document doesn&apos;t contain the answer, it says
        so instead of guessing. Citations like <code>[Page 12]</code> are clickable and jump the
        viewer straight to that page (or scroll to the relevant heading, for Markdown). A Sources
        panel under each answer shows exactly which passages were used.
      </p>

      <h2>Managing documents</h2>
      <p>
        From the Documents page you can rename, download, or delete a document, and search/sort/filter
        your library. Deleting a document removes the original file, its extracted text, its
        embeddings, and any conversations tied to it — this can&apos;t be undone.
      </p>

      <h2>Conversation history</h2>
      <p>
        Every conversation is saved automatically and titled from your first question. Find past
        conversations — across all your documents — on the <strong>Chat History</strong> page, where
        you can search, rename, reopen, or delete them.
      </p>
    </StaticPage>
  );
}
