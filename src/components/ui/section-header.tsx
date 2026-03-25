import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-[color-mix(in_srgb,var(--line)_78%,transparent)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[2.5rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-[15px] leading-7 text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
