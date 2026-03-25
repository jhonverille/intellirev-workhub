import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_96%,white)] shadow-[0_18px_40px_-26px_rgba(15,23,42,0.3)] backdrop-blur-md",
        className,
      )}
      {...props}
    />
  );
}
