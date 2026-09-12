import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { exchangeGoogleCode } from "@/lib/auth/google-oauth";
import { createUser, findUserByEmail } from "@/lib/auth/user-repository";
import { createSessionCookie } from "@/lib/auth/cookies";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split("=")[1];

  const failure = (reason: string) => {
    const dest = new URL("/login", appUrl);
    dest.searchParams.set("error", reason);
    return NextResponse.redirect(dest);
  };

  if (!code || !state || !cookieState || state !== cookieState) {
    return failure("google_oauth_failed");
  }

  try {
    const profile = await exchangeGoogleCode(code);
    if (!profile.email || !profile.email_verified) {
      return failure("google_email_unverified");
    }

    let user = await findUserByEmail(profile.email);
    if (!user) {
      // Derive a reasonable, unique-enough username from the Google profile.
      const base = profile.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
      user = await createUser({
        username: `${base || "user"}_${nanoid(4)}`,
        email: profile.email,
        passwordHash: null,
        provider: "google",
      });
    }

    await createSessionCookie({ id: user.id, username: user.username, email: user.email });

    const response = NextResponse.redirect(new URL("/dashboard", appUrl));
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return failure("google_oauth_failed");
  }
}
