import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, getSessionMaxAgeSeconds, signSession } from "./session";
import type { SessionUser } from "./types";

/**
 * Signs a session token and sets it as an httpOnly, secure (in production),
 * SameSite=lax cookie. `rememberMe` controls whether the cookie persists
 * past the browser session or expires with it — either way the JWT itself
 * still expires server-side after `getSessionMaxAgeSeconds()`.
 */
export async function createSessionCookie(user: SessionUser, rememberMe = true) {
  const maxAge = getSessionMaxAgeSeconds();
  const token = await signSession(user, maxAge);
  const store = await cookies();

  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge } : {}),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function readSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}
