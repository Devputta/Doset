# Docent — Context-Aware AI Document Assistant

A personal portfolio project: upload PDF/Markdown documents and ask questions
answered with retrieval-augmented generation, grounded in your own files with
verifiable citations.

Built incrementally, one day at a time, so each stage is a working
cumulative app rather than a single monolithic drop.

## Current status

- **Day 1 — Frontend foundation.** Landing page, design system, and a
  dashboard preview UI with realistic empty states. No backend, no fake data.
- **Day 2 — Authentication.** Full register/login/forgot-password/reset-password
  flow, Google OAuth scaffolding, protected routes, session cookies.
- **Day 3 — Document upload & management UI.** Drag-and-drop upload with
  progress/cancel/retry, a Documents page (search/sort/filter, status badges,
  delete with confirmation), and a split PDF/Markdown viewer + chat layout.
  Talks to the FastAPI backend below through thin Next.js proxy routes.
- **Day 4 — Real RAG backend.** FastAPI + LangChain + ChromaDB. Uploaded
  documents are actually parsed, chunked, embedded, and stored; `/api/chat`
  retrieves real chunks and answers strictly from them (see `backend/`).
- **Day 5 — Full chat experience.** The chat panel is wired to the real
  backend: streaming-free but fully functional Q&A, inline `[Page N]`
  citations, a sources panel, conversation history, suggested questions
  generated from the document, and a real `react-pdf` viewer (zoom, search,
  fullscreen, page jump, best-effort passage highlighting) plus
  scroll-to-heading for Markdown citations.

See `backend/README.md` for the backend's own architecture notes, and the
root `INSTALL.md` for how to run both services together.

## Getting started

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and set at least:

```
SESSION_SECRET=<run: openssl rand -base64 32>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Google sign-in is optional — leave `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
blank and the "Continue with Google" buttons will show a friendly error
instead of failing silently.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture notes

### Auth persistence is a placeholder, by design

`src/lib/auth/user-repository.ts` persists users and password-reset tokens to
JSON files under `/data` instead of a real database. This is intentional and
temporary: Day 2 needed genuine hashing, duplicate checks, and expiring
tokens before the FastAPI + Postgres backend exists in a later milestone.
Every caller goes through this module's functions
(`findUserByEmail`, `createUser`, `createResetToken`, …) — never through the
filesystem directly — so swapping the body of each function for a `fetch()`
call to the FastAPI service is the only change needed later.

### Session strategy

Sessions are signed JWTs (HS256, via `jose`) stored in an httpOnly, SameSite
cookie (`lib/auth/session.ts`, `lib/auth/cookies.ts`). `jose` was chosen
because it runs in both the Node runtime (API routes) and the Edge runtime
(`src/proxy.ts`, Next.js 16's renamed `middleware.ts`) without extra
polyfills, so both sides verify tokens with the same code.

### Account enumeration

`/api/auth/forgot-password` always returns the same message and status code
whether or not the email is registered. The reset email/link is only
generated when a matching user exists, but the HTTP response can't be used
to tell the difference.

### Google OAuth

Implemented as a manual Authorization Code flow (`lib/auth/google-oauth.ts`,
`/api/auth/google`, `/api/auth/google/callback`) rather than a library, so
there's no framework-version dependency risk. Credentials are read from
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars only — never hardcoded —
and a random `state` value stored in a short-lived cookie prevents CSRF on
the callback.

### Fonts

`globals.css` defines `--font-source-serif` / `--font-inter` /
`--font-plex-mono` as system-font stacks rather than loading Source Serif 4 /
Inter / IBM Plex Mono via `next/font/google`, since the build environment
this was developed in has no outbound access to `fonts.googleapis.com`. Every
component already reads from the `font-display` / `font-sans` / `font-mono`
Tailwind theme tokens, so swapping in real `next/font` loaders (or
self-hosted `@font-face` files) later is a change in one file.

## Project structure

```
src/
  app/                      routes (App Router)
    api/auth/               register, login, logout, session,
                             forgot-password, reset-password, google OAuth
    api/documents/          upload, list, get, delete, file, conversations,
                             suggested-questions — thin proxies to FastAPI
    api/chat/                POST /api/chat, conversation history — proxy to FastAPI
    dashboard/               dashboard, documents (list + [id] viewer/chat),
                             chat-history, settings
    login/ register/
    forgot-password/ reset-password/
  components/
    ui/                      Button, Card, Badge, EmptyState, SectionHeading
    layout/                  Navbar, Footer
    landing/                 Hero, Features, HowItWorks, TechStack, CTA
    dashboard/                Sidebar, DashboardShell, WelcomeCard, ...
    documents/                UploadDropzone, DocumentCard, DocumentsToolbar,
                             DeleteDocumentDialog, PdfViewer, MarkdownViewer,
                             ChatPanel, EmptyStates
    auth/                    AuthCard, FormField, PasswordField, UserMenu, ...
  context/                  ThemeContext, AuthContext
  lib/
    auth/                    session, cookies, password, validation,
                             user-repository, google-oauth, types
    backend-proxy.ts          shared "verify cookie, forward as Bearer token" helper
    documents-client.ts       typed fetch wrappers used by client components
    content.ts, mock-data.ts, utils.ts, config.ts
  types/document.ts          shared domain types, now wired to real data
  proxy.ts                   route protection (Next.js 16's middleware)
```

## How the frontend talks to the backend

Every document/chat request follows the same path:

```
browser --(httpOnly session cookie)--> Next.js route handler (src/app/api/documents|chat/*)
                                            |
                              re-verifies the cookie, forwards the *same*
                              JWT as a Bearer token (no separate backend login)
                                            v
                                   FastAPI backend (backend/)
```

The browser never talks to FastAPI directly — see `src/lib/backend-proxy.ts`.
This keeps `API_BASE_URL` (and every provider API key on the backend) out of
the browser entirely, and means the backend independently verifies every
request rather than trusting Next.js blindly.

```
