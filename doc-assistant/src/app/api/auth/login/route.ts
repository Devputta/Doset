import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth/validation";
import { findUserByEmail, findUserByUsername } from "@/lib/auth/user-repository";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/cookies";

const GENERIC_ERROR = "Incorrect email/username or password";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { identifier, password, rememberMe } = parsed.data;
  const isEmail = identifier.includes("@");

  const user = isEmail
    ? await findUserByEmail(identifier)
    : await findUserByUsername(identifier);

  // Same generic message whether the account doesn't exist, was created via
  // Google (no password set), or the password is wrong — never reveal which.
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await createSessionCookie(
    { id: user.id, username: user.username, email: user.email },
    rememberMe ?? true
  );

  return NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email },
  });
}
