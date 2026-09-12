import { type ButtonHTMLAttributes, type AnchorHTMLAttributes, forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium " +
  "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 " +
  "whitespace-nowrap";

const variants = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary:
    "bg-transparent text-text-primary border border-border hover:bg-surface-2",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-2",
  inverse: "bg-white text-ink hover:bg-paper-2",
};

const sizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-[15px]",
};

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

interface ButtonOwnProps {
  variant?: Variant;
  size?: Size;
}

type ButtonAsButton = ButtonOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = ButtonOwnProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsLink;

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => {
    const classes = cn(base, variants[variant], sizes[size], className);

    if (props.href) {
      const { href, ...rest } = props as ButtonAsLink;
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          {...rest}
        />
      );
    }

    const { ...rest } = props as ButtonAsButton;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        {...rest}
      />
    );
  }
);

Button.displayName = "Button";
