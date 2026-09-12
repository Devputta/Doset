import { NextResponse } from "next/server";
import {
  proxyToBackend,
  relayJson,
  requireUserAndToken,
  unauthorizedResponse,
  UnauthorizedError,
} from "@/lib/backend-proxy";

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

    const upstream = await proxyToBackend("/api/chat", token, {
      method: "POST",
      jsonBody: {
        document_id: body.documentId,
        question: body.question,
        conversation_id: body.conversationId ?? null,
      },
    });
    return relayJson(upstream);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}
