import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/auth/validation";
import { consumeResetToken, updateUserPassword } from "@/lib/auth/user-repository";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const userId = await consumeResetToken(parsed.data.token);
  if (!userId) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await updateUserPassword(userId, passwordHash);

  return NextResponse.json({ message: "Your password has been updated." });
}
