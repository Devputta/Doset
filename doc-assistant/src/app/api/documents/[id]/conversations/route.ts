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
    const upstream = await proxyToBackend(`/api/documents/${id}/conversations`, token, { method: "GET" });
    return relayJson(upstream);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}
