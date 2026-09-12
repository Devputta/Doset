import { jwtVerify } from "jose";
import { getSecretKey } from "./session";
import { findUserById } from "./user-repository";
import type { SessionUser } from "./types";

/**
 * `verifySession` (session.ts) is edge-safe — signature + expiry only — so
 * it can run in `proxy.ts` middleware. This stricter version additionally
 * checks the token's issued-at time against the user's
 * `sessionsInvalidatedAt` (set by "Logout all sessions"), which requires
 * reading the user store — Node-only, hence it's a separate file used only
 * by Node route handlers (see lib/backend-proxy.ts), not middleware.
 */
export async function verifySessionStrict(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  let payload;
  try {
    ({ payload } = await jwtVerify(token, getSecretKey()));
  } catch {
    return null;
  }

  if (
    typeof payload.id !== "string" ||
    typeof payload.username !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.iat !== "number"
  ) {
    return null;
  }

  const user = await findUserById(payload.id);
  if (!user) return null;

  if (user.sessionsInvalidatedAt) {
    const invalidatedAtMs = Date.parse(user.sessionsInvalidatedAt);
    if (payload.iat * 1000 < invalidatedAtMs) return null;
  }

  return { id: user.id, username: user.username, email: user.email };
}
