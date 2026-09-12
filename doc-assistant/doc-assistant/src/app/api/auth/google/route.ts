import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  if (!isGoogleOAuthConfigured()) {
    const url = new URL("/login", appUrl);
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  const state = nanoid();
  const response = NextResponse.redirect(buildGoogleAuthUrl(state));

  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
