import { NextResponse } from "next/server";
import {
  proxyToBackend,
  relayJson,
  requireUserAndToken,
  unauthorizedResponse,
  UnauthorizedError,
} from "@/lib/backend-proxy";

// Route handlers buffer the multipart body in memory before forwarding it,
// so this must run on the Node runtime (not Edge) and needs a body size
// limit that comfortably covers MAX_FILE_SIZE_MB.
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { token } = await requireUserAndToken();

    const incomingForm = await request.formData().catch(() => null);
    if (!incomingForm) {
      return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
    }

    const file = incomingForm.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "missing_file", message: "Expected a multipart field named 'file'." },
        { status: 400 }
      );
    }

    const forwardForm = new FormData();
    forwardForm.set("file", file, file.name);

    const upstream = await proxyToBackend("/api/documents/upload", token, {
      method: "POST",
      body: forwardForm,
    });
    return relayJson(upstream);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}
