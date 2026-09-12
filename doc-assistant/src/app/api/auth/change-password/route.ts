import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth/cookies";
import { verifySessionStrict } from "@/lib/auth/session-guard";
import { changePasswordSchema } from "@/lib/auth/validation";
import { findUserById, updateUserPassword } from "@/lib/auth/user-repository";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  const user = await verifySessionStrict(await readSessionCookie());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const stored = await findUserById(user.id);
  if (!stored || !stored.passwordHash) {
    return NextResponse.json(
      { error: "no_password", message: "This account signs in with Google and has no password to change." },
      { status: 400 }
    );
  }

  const valid = await verifyPassword(parsed.data.currentPassword, stored.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "validation_error", fieldErrors: { currentPassword: ["Current password is incorrect"] } },
      { status: 400 }
    );
  }

  await updateUserPassword(user.id, await hashPassword(parsed.data.newPassword));
  return NextResponse.json({ ok: true });
}
