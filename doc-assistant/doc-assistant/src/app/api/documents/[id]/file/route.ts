import { NextResponse } from "next/server";
import { proxyToBackend, requireUserAndToken, unauthorizedResponse, UnauthorizedError } from "@/lib/backend-proxy";

type Params = { params: Promise<{ id: string }> };

// Streams the raw file straight through (no JSON relay) so the <object>/PDF
// viewer and the Markdown renderer can fetch it directly by URL.
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { token } = await requireUserAndToken();
    const { search } = new URL(request.url);
    const upstream = await proxyToBackend(`/api/documents/${id}/file${search}`, token, { method: "GET" });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "backend_error", message: text || upstream.statusText },
        { status: upstream.status }
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "inline",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}
