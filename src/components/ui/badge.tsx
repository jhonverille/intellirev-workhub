import { cn } from "@/lib/utils";

type BadgeProps = {
  children: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  className?: string;
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-[var(--surface-strong)] text-[var(--foreground)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
