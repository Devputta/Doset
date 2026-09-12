import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/cookies";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
