"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDeferredValue, useId, useMemo, useState } from "react";
import {
  CheckSquareIcon,
  ChevronRightIcon,
  FolderIcon,
  LinkIcon,
  MenuIcon,
  MoonIcon,
  NoteIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
  XIcon,
} from "@/components/icons";
import { pageTitles } from "@/lib/navigation";
import { useWorkHub } from "@/lib/work-hub-store";
import { getInitials, safeLower } from "@/lib/utils";
import { UserButton } from "./user-button";

type TopNavProps = {
  onOpenSidebar: () => void;
};

export function TopNav({ onOpenSidebar }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, resolvedTheme, searchQuery, setSearchQuery, setTheme } = useWorkHub();
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(searchQuery);
  const resultsId = useId();

  const searchResults = useMemo(() => {
    const query = safeLower(deferredQuery.trim());
    if (!query) {
      return [];
    }

    return [
      ...data.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        subtitle: "Task",
        details: task.description,
        href: "/tasks",
        icon: <CheckSquareIcon className="h-4 w-4" />,
      })),
      ...data.projects.map((project) => ({
        id: project.id,
        title: project.name,
        subtitle: "Project",
        details: project.description,
        href: "/projects",
        icon: <FolderIcon className="h-4 w-4" />,
      })),
      ...data.notes.map((note) => ({
        id: note.id,
        title: note.title,
        subtitle: "Note",
        details: `${note.tags.join(" ")} ${note.content}`,
        href: "/notes",
        icon: <NoteIcon className="h-4 w-4" />,
      })),
      ...data.links.map((link) => ({
        id: link.id,
        title: link.title,
        subtitle: "Quick link",
        details: `${link.category} ${link.url}`,
        href: "/links",
        icon: <LinkIcon className="h-4 w-4" />,
      })),
    ]
      .filter((item) =>
        safeLower(`${item.title} ${item.details} ${item.subtitle}`).includes(query),
      )
      .slice(0, 6);
  }, [data.links, data.notes, data.projects, data.tasks, deferredQuery]);

  const isDark = resolvedTheme === "dark";
  const pageTitle = pageTitles[pathname] ?? "Work Hub";

  const openSearchResult = (index: number) => {
    const result = searchResults[index];
    if (!result) {
      return;
    }

    setShowResults(false);
    router.push(result.href);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2.5 text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hidden"
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>

          <div className="min-w-0">
            <p className="text-sm text-[var(--muted)]">{data.name || "Workspace"}</p>
            <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {pageTitle}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2.5 text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            <UserButton />
          </div>
        </div>

        <div className="relative mt-4 max-w-xl md:ml-auto">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              role="combobox"
              aria-expanded={showResults}
              aria-controls={resultsId}
              aria-autocomplete="list"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => {
                setShowResults(true);
                setActiveIndex(0);
              }}
              onBlur={() => window.setTimeout(() => setShowResults(false), 120)}
              onKeyDown={(event) => {
                if (!searchResults.length && event.key === "Escape") {
                  setShowResults(false);
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setShowResults(true);
                  setActiveIndex((current) =>
                    current >= searchResults.length - 1 ? 0 : current + 1,
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setShowResults(true);
                  setActiveIndex((current) =>
                    current <= 0 ? searchResults.length - 1 : current - 1,
                  );
                } else if (event.key === "Enter" && showResults && searchResults.length) {
                  event.preventDefault();
                  openSearchResult(activeIndex);
                } else if (event.key === "Escape") {
                  setShowResults(false);
                }
              }}
              placeholder="Search tasks, notes, projects, and links"
              className="h-11 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] pl-11 pr-11 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                }}
                className="absolute right-2 top-1/2 rounded-xl p-2 text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label="Clear global search"
              >
                <XIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {showResults && searchQuery.trim() ? (
            <div
              id={resultsId}
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+0.65rem)] overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-xl"
            >
              {searchResults.length ? (
                <div className="p-2">
                  {searchResults.map((item, index) => (
                    <Link
                      key={`${item.subtitle}-${item.id}`}
                      href={item.href}
                      role="option"
                      aria-selected={activeIndex === index}
                      onMouseEnter={() => setActiveIndex(index)}
                      className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition hover:bg-[var(--surface-strong)] data-[active=true]:bg-[var(--surface-strong)]"
                      data-active={activeIndex === index}
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-2xl bg-[var(--surface-strong)] p-2 text-[var(--accent)]">
                          {item.icon}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {item.title}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {item.subtitle}
                            {item.details ? ` - ${item.details.slice(0, 52)}` : ""}
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-[var(--muted)]" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-5 text-sm text-[var(--muted)]">
                  No matching items yet.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
