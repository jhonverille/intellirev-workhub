import type { ReactNode } from "react";
import { Surface } from "@/components/ui/surface";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Surface className="overflow-hidden p-1">
      <div className="flex flex-col items-start gap-5 rounded-[24px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_94%,white),var(--surface))] p-6 sm:p-8">
      <div className="rounded-3xl bg-[color-mix(in_srgb,var(--accent-soft)_72%,white)] p-3 text-[var(--accent)]">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          {title}
        </h3>
        <p className="max-w-xl text-[15px] leading-7 text-[var(--muted)]">
          {description}
        </p>
      </div>
      {action}
      </div>
    </Surface>
  );
}
