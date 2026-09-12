import {
  proxyToBackend,
  relayJson,
  requireUserAndToken,
  unauthorizedResponse,
  UnauthorizedError,
} from "@/lib/backend-proxy";

export async function GET(request: Request) {
  try {
    const { token } = await requireUserAndToken();
    const { search } = new URL(request.url);
    const upstream = await proxyToBackend(`/api/documents${search}`, token, { method: "GET" });
    return relayJson(upstream);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}
