import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm hover:bg-[var(--accent-strong)] active:translate-y-px",
  secondary:
    "bg-[var(--surface-strong)] text-[var(--foreground)] ring-1 ring-[var(--line)] hover:bg-[var(--surface-hover)] active:translate-y-px",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-strong)] active:translate-y-px",
  danger:
    "bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[color-mix(in_srgb,var(--danger)_16%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger-soft)_65%,white)] active:translate-y-px",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium tracking-[-0.01em] transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
