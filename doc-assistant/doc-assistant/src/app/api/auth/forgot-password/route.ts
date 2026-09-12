import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/auth/validation";
import { findUserByEmail, createResetToken } from "@/lib/auth/user-repository";

const GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const user = await findUserByEmail(parsed.data.email);

  // Only generate/send a token if the account exists, but respond with the
  // exact same message and status either way so the response itself can't
  // be used to enumerate registered emails.
  if (user) {
    const token = await createResetToken(user.id);

    // TODO(day-3+): send this via a real email provider. For now, log it
    // server-side so the flow is testable end-to-end in development.
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    console.log(`[password reset] ${user.email} -> ${resetUrl}`);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
