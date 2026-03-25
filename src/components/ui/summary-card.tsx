import type { ReactNode } from "react";
import { Surface } from "@/components/ui/surface";

type SummaryCardProps = {
  label: string;
  value: string;
  meta: string;
  icon: ReactNode;
};

export function SummaryCard({ label, value, meta, icon }: SummaryCardProps) {
  return (
    <Surface className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-[var(--accent-soft)] via-transparent to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
          <div>
            <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {value}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{meta}</p>
          </div>
        </div>
        <div className="rounded-3xl bg-[color-mix(in_srgb,var(--accent-soft)_70%,white)] p-3 text-[var(--accent)]">
          {icon}
        </div>
      </div>
    </Surface>
  );
}
