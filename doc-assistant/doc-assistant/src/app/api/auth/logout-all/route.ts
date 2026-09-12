import { NextResponse } from "next/server";
import { readSessionCookie, clearSessionCookie } from "@/lib/auth/cookies";
import { verifySessionStrict } from "@/lib/auth/session-guard";
import { invalidateAllSessions } from "@/lib/auth/user-repository";

export async function POST() {
  const user = await verifySessionStrict(await readSessionCookie());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await invalidateAllSessions(user.id);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
