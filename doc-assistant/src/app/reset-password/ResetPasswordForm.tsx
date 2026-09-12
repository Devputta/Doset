"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";
import { resetPasswordSchema } from "@/lib/auth/validation";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthCard
        title="Invalid reset link"
        footer={
          <Link href="/forgot-password" className="font-medium text-brand hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-center text-sm text-text-secondary">
          This password reset link is missing its token. Request a new one to continue.
        </p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title="Password updated"
        footer={
          <Link href="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="text-sm text-text-secondary">
            Your password has been updated. You can now log in with your new password.
          </p>
        </div>
      </AuthCard>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = resetPasswordSchema.safeParse({ token, ...values });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({ password: flat.password?.[0], confirmPassword: flat.confirmPassword?.[0] });
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...values }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setDone(true);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Set a new password">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          error={errors.password}
          hint={!errors.password ? "8+ characters, with upper, lower, and a number" : undefined}
        />
        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => setValues((v) => ({ ...v, confirmPassword: e.target.value }))}
          error={errors.confirmPassword}
        />

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
