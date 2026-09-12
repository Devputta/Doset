import { NextResponse } from "next/server";
import { readSessionCookie, createSessionCookie } from "@/lib/auth/cookies";
import { verifySessionStrict } from "@/lib/auth/session-guard";
import { updateProfileSchema } from "@/lib/auth/validation";
import { findUserByUsername, updateUsername } from "@/lib/auth/user-repository";

export async function POST(request: Request) {
  const user = await verifySessionStrict(await readSessionCookie());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { username } = parsed.data;
  if (username !== user.username) {
    const existing = await findUserByUsername(username);
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: "validation_error", fieldErrors: { username: ["This username is already taken"] } },
        { status: 409 }
      );
    }
    await updateUsername(user.id, username);
  }

  // Re-sign the cookie so the new username is reflected immediately without
  // requiring a re-login.
  await createSessionCookie({ ...user, username });
  return NextResponse.json({ id: user.id, username, email: user.email });
}
