import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth/cookies";
import { verifySessionStrict } from "@/lib/auth/session-guard";
import type { SessionUser } from "@/lib/auth/types";

/**
 * Every /api/documents/* and /api/chat route in this app is a thin proxy:
 *
 *   browser --(httpOnly session cookie)--> Next.js route handler
 *                                              |
 *                                (re-signs the *same* JWT as a
 *                                 Bearer token — no shared secret,
 *                                 no re-issuing, just forwarding)
 *                                              v
 *                                     FastAPI backend
 *
 * The backend independently verifies the JWT with the same SESSION_SECRET
 * (see backend/app/core/security.py), so it never has to trust Next.js —
 * it trusts the token, exactly the way it would if the browser called it
 * directly. This function centralizes that "verify cookie, forward as
 * Bearer token" step so every route file stays a few lines long.
 */

export class UnauthorizedError extends Error {}

export async function requireUserAndToken(): Promise<{ user: SessionUser; token: string }> {
  const token = await readSessionCookie();
  const user = await verifySessionStrict(token);
  if (!user || !token) {
    throw new UnauthorizedError("Not signed in");
  }
  return { user, token };
}

function getBackendUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error(
      "API_BASE_URL is not set. Copy .env.example to .env.local and point it at the FastAPI backend."
    );
  }
  return url.replace(/\/+$/, "");
}

/**
 * Proxies a request to the FastAPI backend, attaching the caller's session
 * token as a Bearer credential. `init.body` may be a stream, FormData, or
 * plain object (objects are JSON-encoded automatically).
 */
export async function proxyToBackend(
  path: string,
  token: string,
  init: RequestInit & { jsonBody?: unknown } = {}
): Promise<Response> {
  const { jsonBody, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Authorization", `Bearer ${token}`);

  let body = rest.body;
  if (jsonBody !== undefined) {
    body = JSON.stringify(jsonBody);
    finalHeaders.set("Content-Type", "application/json");
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getBackendUrl()}${path}`, {
      ...rest,
      body,
      headers: finalHeaders,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        error: "backend_unreachable",
        message:
          "Could not reach the FastAPI backend. Is it running (uvicorn app.main:app) and is API_BASE_URL set correctly?",
      },
      { status: 502 }
    );
  }

  return upstream;
}

/** Passes a JSON (or empty) backend response straight through to the browser. */
export async function relayJson(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text();
  const body = text ? safeJsonParse(text) : null;
  return NextResponse.json(body, { status: upstream.status });
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: "invalid_backend_response", raw: text };
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized", message: "Not signed in" }, { status: 401 });
}
