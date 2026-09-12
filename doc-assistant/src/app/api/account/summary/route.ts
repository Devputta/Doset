import {
  proxyToBackend,
  relayJson,
  requireUserAndToken,
  unauthorizedResponse,
  UnauthorizedError,
} from "@/lib/backend-proxy";

export async function GET() {
  try {
    const { token } = await requireUserAndToken();
    const upstream = await proxyToBackend("/api/account/summary", token, { method: "GET" });
    return relayJson(upstream);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }
}
