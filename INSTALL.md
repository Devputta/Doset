# Install & run — Docent (Context-Aware AI Document Assistant)

Prefer Docker? See the root [README.md](./README.md#docker-setup) for a
single `docker compose up`. This guide covers running the two services
directly (better for active development, since both support hot reload).

This project has two services that run side by side:

```
doc-assistant/   Next.js frontend (UI, auth, proxy routes)   -> http://localhost:3000
backend/         FastAPI backend (RAG: parsing, embeddings,   -> http://localhost:8000
                 ChromaDB, chat)
```

The frontend never talks to the backend from the browser — every
`/api/documents/*` and `/api/chat*` call is proxied server-side by Next.js,
which forwards the signed-in user's session as a Bearer token. That means:

1. Both services must be running at the same time.
2. `SESSION_SECRET` must be **identical** in both `.env` files (see below) —
   it's how the backend verifies who's calling without a second login system.

## 0. Prerequisites

- **Node.js 20+** and npm (for the frontend)
- **Python 3.11+** and pip (for the backend)
- An **OpenAI API key** (default provider for both embeddings and the LLM) —
  or an Anthropic key if you set `LLM_PROVIDER=anthropic`. See
  `backend/.env.example` for every provider knob.

## 1. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
```

Edit `backend/.env`:

```
SESSION_SECRET=<the exact same value you'll put in doc-assistant/.env.local>
OPENAI_API_KEY=sk-...
```

Generate a strong shared secret once and reuse it in both places:

```bash
openssl rand -base64 32
```

Run the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Check it's alive: `curl http://localhost:8000/health` → `{"status":"ok"}`.
Interactive API docs are at `http://localhost:8000/docs`.

## 2. Frontend setup

In a second terminal, from the repo root:

```bash
cd doc-assistant
npm install
cp .env.example .env.local
```

Edit `doc-assistant/.env.local`:

```
SESSION_SECRET=<the same value you put in backend/.env>
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account,
and go to **Dashboard → Documents** to upload a PDF or Markdown file.

## 3. Using it

1. Upload a PDF or `.md`/`.markdown` file (Documents page → Upload document).
   It appears immediately as **Uploaded**, then flips to **Processing**
   automatically while the backend extracts text, chunks it, and generates
   embeddings — usually a few seconds for a short document.
2. Once it says **Ready**, click **Open** (or **Chat**) to get the split
   viewer: the PDF/Markdown on the left, chat on the right.
3. Ask a question, or click one of the suggested questions. Answers cite
   their source inline (`[Page 12]`) — click a citation, or a card in the
   Sources panel, to jump the viewer to that page (or scroll to that
   heading, for Markdown).

## Troubleshooting

- **"Could not reach the FastAPI backend" in the UI** — the backend isn't
  running, or `API_BASE_URL` in `doc-assistant/.env.local` doesn't match
  where it's listening. Confirm `curl http://localhost:8000/health` works
  first.
- **401s on every `/api/documents` or `/api/chat` call** — `SESSION_SECRET`
  doesn't match between `backend/.env` and `doc-assistant/.env.local`, or
  you're not signed in (re-check `/login`).
- **A document gets stuck on "Processing" then flips to "Failed"** — open
  the document card; the error message is shown there. The most common
  cause is a missing/invalid `OPENAI_API_KEY` in `backend/.env`, or (for
  PDFs) a scanned/image-only PDF with no extractable text — this backend
  does not include OCR.
- **PDF viewer shows a loading spinner forever** — `react-pdf` loads its
  worker script from `unpkg.com` at runtime; if you're on a fully offline
  network, either allow that domain or self-host the worker file (see the
  comment in `doc-assistant/src/components/documents/PdfViewer.tsx`).
- **Port already in use** — change `--port` for uvicorn and `API_BASE_URL`
  together, or run Next.js on another port with `npm run dev -- -p 3001`
  (and update `NEXT_PUBLIC_APP_URL`).

## What's implemented, day by day

See the root `README.md` for the full architecture writeup (with diagrams).
Short version: Day 1–2 built the frontend shell and real authentication;
Day 3 added upload/document management UI; Day 4 built the actual RAG
backend (FastAPI + LangChain + ChromaDB); Day 5 wired the chat UI to it
end-to-end with citations, sources, a real PDF viewer, and conversation
history; Day 6 added persistent/searchable/renameable chat history,
document rename/download, and a settings page (profile, security, storage
dashboard); Day 7 added streaming answers (SSE), prompt-injection–resistant
retrieval, global error handling, request IDs, basic rate limiting, a
mobile-tabbed layout, and Docker support.

## Known limitations (by design, for a portfolio-scale project)

- Chat responses are not streamed (no SSE) — the answer arrives as one
  response once generation finishes.
- No OCR — scanned/image-only PDFs will fail processing with a clear error
  rather than silently returning nothing.
- Metadata lives in SQLite and vectors in a single filtered ChromaDB
  collection, not Postgres/Pinecone — both READMEs above explain the exact
  swap-in points if you outgrow this.
- The dashboard's home page ("Recent documents"/"Recent conversations"
  widgets) still renders from `lib/mock-data.ts`'s empty state rather than
  live data — only the dedicated Documents page and viewer are wired up.
