import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/session";

export async function GET() {
  const token = await readSessionCookie();
  const user = await verifySession(token);
  return NextResponse.json({ user });
}
