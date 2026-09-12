import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const fieldId = id ?? props.name;
    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            "h-10 w-full rounded-md border bg-surface px-3 text-sm text-text-primary",
            "placeholder:text-text-muted transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-brand/40",
            error ? "border-danger" : "border-border",
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...props}
        />
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

FormField.displayName = "FormField";
