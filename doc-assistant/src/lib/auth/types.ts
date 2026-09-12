/**
 * Auth domain types.
 *
 * `StoredUser` is the shape persisted in the interim JSON store (see
 * `user-repository.ts`). `SessionUser` is the trimmed, non-sensitive shape
 * that goes into the signed session token and is exposed to the client —
 * it must never include `passwordHash`.
 */

export type AuthProvider = "credentials" | "google";

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  /** Null for accounts created purely via Google OAuth. */
  passwordHash: string | null;
  provider: AuthProvider;
  createdAt: string;
  /** Set by "Logout all sessions" (Day 6). Tokens issued (iat) before this
   *  instant are treated as invalid even if not yet expired. Edge middleware
   *  doesn't check this (see session-guard.ts) — only the Node-side proxy
   *  routes that actually touch documents/chat do. */
  sessionsInvalidatedAt?: string;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: string;
}
