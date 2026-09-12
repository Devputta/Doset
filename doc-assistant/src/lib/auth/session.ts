import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "./types";

export const SESSION_COOKIE_NAME = "session_token";

export function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Copy .env.example to .env.local and set a random secret."
    );
  }
  return new TextEncoder().encode(secret);
}

export function getSessionMaxAgeSeconds(): number {
  const raw = process.env.SESSION_MAX_AGE_SECONDS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 24 * 7; // 7 days
}

/** Signs a session JWT for the given user. Used after login/register/OAuth. */
export async function signSession(
  user: SessionUser,
  maxAgeSeconds: number = getSessionMaxAgeSeconds()
): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(getSecretKey());
}

/**
 * Verifies a session JWT, returning the embedded user or null if the token
 * is missing, malformed, tampered with, or expired. Safe to call from
 * middleware (Edge runtime) and from Node route handlers alike.
 */
export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey()); // throws if SESSION_SECRET is unset
    if (
      typeof payload.id === "string" &&
      typeof payload.username === "string" &&
      typeof payload.email === "string"
    ) {
      return { id: payload.id, username: payload.username, email: payload.email };
    }
    return null;
  } catch {
    // Covers expired tokens and invalid signatures alike.
    return null;
  }
}
