"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const fieldId = id ?? props.name;

    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            className={cn(
              "h-10 w-full rounded-md border bg-surface px-3 pr-10 text-sm text-text-primary",
              "placeholder:text-text-muted transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-brand/40",
              error ? "border-danger" : "border-border",
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-text-muted hover:text-text-secondary"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? (
          <p id={`${fieldId}-error`} className="text-xs text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={`${fieldId}-hint`} className="text-xs text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

PasswordField.displayName = "PasswordField";
