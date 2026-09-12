import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { PasswordResetToken, StoredUser } from "./types";

/**
 * Interim persistence layer.
 * -----------------------------------------------------------------------
 * Day 2 needs real registration/login/reset behavior (duplicate checks,
 * hashed passwords, expiring reset tokens) before the FastAPI backend and
 * its Postgres database exist. Rather than fake it, this repository
 * implements the real logic against a local JSON file.
 *
 * When the FastAPI service lands, only this file should need to change:
 * every caller goes through the functions below (`findUserByEmail`,
 * `createUser`, etc.), never through the filesystem directly. Replace the
 * bodies with `fetch()` calls to the backend and nothing else in the app
 * needs to move.
 * -----------------------------------------------------------------------
 */

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const RESET_TOKENS_FILE = path.join(DATA_DIR, "reset-tokens.json");

async function ensureDataFile(file: string) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, "[]", "utf-8");
  }
}

async function readJson<T>(file: string): Promise<T[]> {
  await ensureDataFile(file);
  const raw = await fs.readFile(file, "utf-8");
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function writeJson<T>(file: string, data: T[]) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const users = await readJson<StoredUser>(USERS_FILE);
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function findUserByUsername(username: string): Promise<StoredUser | undefined> {
  const users = await readJson<StoredUser>(USERS_FILE);
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function findUserById(id: string): Promise<StoredUser | undefined> {
  const users = await readJson<StoredUser>(USERS_FILE);
  return users.find((u) => u.id === id);
}

export async function createUser(input: {
  username: string;
  email: string;
  passwordHash: string | null;
  provider: StoredUser["provider"];
}): Promise<StoredUser> {
  const users = await readJson<StoredUser>(USERS_FILE);
  const user: StoredUser = {
    id: nanoid(),
    username: input.username,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    provider: input.provider,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeJson(USERS_FILE, users);
  return user;
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const users = await readJson<StoredUser>(USERS_FILE);
  const next = users.map((u) => (u.id === userId ? { ...u, passwordHash } : u));
  await writeJson(USERS_FILE, next);
}

export async function updateUsername(userId: string, username: string) {
  const users = await readJson<StoredUser>(USERS_FILE);
  const next = users.map((u) => (u.id === userId ? { ...u, username } : u));
  await writeJson(USERS_FILE, next);
}

/** "Logout all sessions" (Day 6 Settings page). See StoredUser.sessionsInvalidatedAt. */
export async function invalidateAllSessions(userId: string) {
  const users = await readJson<StoredUser>(USERS_FILE);
  const next = users.map((u) =>
    u.id === userId ? { ...u, sessionsInvalidatedAt: new Date().toISOString() } : u
  );
  await writeJson(USERS_FILE, next);
}

// --- Password reset tokens -------------------------------------------------

export async function createResetToken(userId: string, ttlMinutes = 30): Promise<string> {
  const tokens = await readJson<PasswordResetToken>(RESET_TOKENS_FILE);
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();

  const withoutExisting = tokens.filter((t) => t.userId !== userId);
  withoutExisting.push({ token, userId, expiresAt });
  await writeJson(RESET_TOKENS_FILE, withoutExisting);

  return token;
}

export async function consumeResetToken(token: string): Promise<string | null> {
  const tokens = await readJson<PasswordResetToken>(RESET_TOKENS_FILE);
  const match = tokens.find((t) => t.token === token);

  if (!match) return null;
  if (new Date(match.expiresAt).getTime() < Date.now()) return null;

  await writeJson(
    RESET_TOKENS_FILE,
    tokens.filter((t) => t.token !== token)
  );

  return match.userId;
}
