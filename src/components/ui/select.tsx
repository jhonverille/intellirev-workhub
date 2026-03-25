import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] shadow-sm transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)] focus:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_28%,transparent)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
