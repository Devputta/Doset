"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormField } from "@/components/auth/FormField";
import { PasswordField } from "@/components/auth/PasswordField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { loginSchema } from "@/lib/auth/validation";
import { useAuth } from "@/context/AuthContext";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-in isn't configured yet. Use email and password instead.",
  google_oauth_failed: "Google sign-in didn't complete. Please try again.",
  google_email_unverified: "Your Google email isn't verified, so we couldn't sign you in.",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const [values, setValues] = useState({ identifier: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(
    OAUTH_ERROR_MESSAGES[searchParams.get("error") ?? ""] ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ ...values, rememberMe });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({ identifier: flat.identifier?.[0], password: flat.password?.[0] });
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, rememberMe }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      await refresh();
      const callbackUrl = searchParams.get("callbackUrl");
      router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to continue where you left off."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand hover:underline">
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label="Email or username"
          name="identifier"
          autoComplete="username"
          value={values.identifier}
          onChange={(e) => setValues((v) => ({ ...v, identifier: e.target.value }))}
          error={errors.identifier}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          error={errors.password}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border text-brand focus:ring-brand/40"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm text-brand hover:underline">
            Forgot password?
          </Link>
        </div>

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton label="Continue with Google" />
    </AuthCard>
  );
}
