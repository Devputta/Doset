import { NextResponse } from "next/server";
import {
  proxyToBackend,
  requireUserAndToken,
  unauthorizedResponse,
  UnauthorizedError,
} from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { token } = await requireUserAndToken();
    const body = await request.json().catch(() => null);

    if (!body || typeof body.documentId !== "string" || typeof body.question !== "string") {
      return NextResponse.json(
        { error: "validation_error", message: "documentId and question are required." },
        { status: 400 }
      );
    }

    const upstream = await proxyToBackend("/api/chat/stream", token, {
      method: "POST",
      jsonBody: {
        document_id: body.documentId,
        question: body.question,
        conversation_id: body.conversationId ?? null,
      },
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "backend_error", message: text || upstream.statusText },
        { status: upstream.status || 502 }
      );
    }

    // Passed through untouched, unbuffered — this must not go through
    // relayJson (which awaits the full body) or streaming would be lost.
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}
