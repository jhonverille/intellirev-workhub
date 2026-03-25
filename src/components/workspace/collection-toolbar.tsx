"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { FilterIcon, SearchIcon, XIcon } from "@/components/icons";

type CollectionToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  totalLabel: string;
  totalCount: number;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  filters?: ReactNode;
};

export function CollectionToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  totalLabel,
  totalCount,
  hasActiveFilters = false,
  onReset,
  filters,
}: CollectionToolbarProps) {
  return (
    <Surface className="overflow-hidden p-1">
      <div className="rounded-[24px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_94%,white),var(--surface))] p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-5">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-11"
              />
            </div>
            {filters ? (
              <div className="grid gap-4 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
                {filters}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:pt-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--muted)]">
              <FilterIcon className="h-4 w-4" />
              {totalCount} matching {totalLabel}
              {totalCount === 1 ? "" : "s"}
            </div>
            {hasActiveFilters && onReset ? (
              <Button
                variant="ghost"
                size="sm"
                icon={<XIcon className="h-4 w-4" />}
                onClick={onReset}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Surface>
  );
}
