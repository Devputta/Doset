import { NextResponse } from "next/server";
import {
  proxyToBackend,
  relayJson,
  requireUserAndToken,
  unauthorizedResponse,
  UnauthorizedError,
} from "@/lib/backend-proxy";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { token } = await requireUserAndToken();
    const upstream = await proxyToBackend(`/api/chat/conversations/${id}`, token, { method: "GET" });
    return relayJson(upstream);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { token } = await requireUserAndToken();
    const upstream = await proxyToBackend(`/api/chat/conversations/${id}`, token, { method: "DELETE" });
    return relayJson(upstream);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { token } = await requireUserAndToken();
    const body = await request.json().catch(() => null);
    if (!body || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "validation_error", message: "title is required" },
        { status: 400 }
      );
    }
    const upstream = await proxyToBackend(`/api/chat/conversations/${id}`, token, {
      method: "PATCH",
      jsonBody: { title: body.title },
    });
    return relayJson(upstream);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}
