import { cn } from "@/lib/utils";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
};

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-start justify-between gap-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-sm transition hover:border-[color-mix(in_srgb,var(--accent)_20%,var(--line))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-[var(--foreground)]">
          {label}
        </span>
        {description ? (
          <span className="block text-sm text-[var(--muted)]">{description}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "relative mt-0.5 flex h-7 w-12 items-center rounded-full p-1 transition",
            checked ? "bg-[var(--accent)]" : "bg-[var(--surface-strong)]",
        )}
      >
        <span
          className={cn(
            "h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
