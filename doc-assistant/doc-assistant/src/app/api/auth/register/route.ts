import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/auth/validation";
import { createUser, findUserByEmail, findUserByUsername } from "@/lib/auth/user-repository";
import { hashPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/cookies";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { username, email, password } = parsed.data;

  const [existingEmail, existingUsername] = await Promise.all([
    findUserByEmail(email),
    findUserByUsername(username),
  ]);

  if (existingEmail) {
    return NextResponse.json(
      { error: "validation_error", fieldErrors: { email: ["An account with this email already exists"] } },
      { status: 409 }
    );
  }

  if (existingUsername) {
    return NextResponse.json(
      { error: "validation_error", fieldErrors: { username: ["This username is already taken"] } },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ username, email, passwordHash, provider: "credentials" });

  await createSessionCookie({ id: user.id, username: user.username, email: user.email });

  return NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email },
  });
}
