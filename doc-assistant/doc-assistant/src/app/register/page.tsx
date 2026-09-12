"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormField } from "@/components/auth/FormField";
import { PasswordField } from "@/components/auth/PasswordField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { registerSchema } from "@/lib/auth/validation";
import { useAuth } from "@/context/AuthContext";

type FieldErrors = Partial<Record<"username" | "email" | "password" | "confirmPassword", string>>;

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [values, setValues] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        username: flat.username?.[0],
        email: flat.email?.[0],
        password: flat.password?.[0],
        confirmPassword: flat.confirmPassword?.[0],
      });
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors({
            username: data.fieldErrors.username?.[0],
            email: data.fieldErrors.email?.[0],
          });
        } else {
          setFormError(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      await refresh();
      router.push("/dashboard");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Start asking questions of your own documents."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label="Username"
          name="username"
          autoComplete="username"
          value={values.username}
          onChange={(e) => update("username", e.target.value)}
          error={errors.username}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => update("password", e.target.value)}
          error={errors.password}
          hint={!errors.password ? "8+ characters, with upper, lower, and a number" : undefined}
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Register"}
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
