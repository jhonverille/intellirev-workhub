"use client";

import type { InputHTMLAttributes } from "react";

export function Checkbox({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={`h-5 w-5 rounded-lg border-[var(--line)] bg-[var(--surface-strong)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer transition-all hover:border-[var(--muted)] ${className}`}
      {...props}
    />
  );
}
