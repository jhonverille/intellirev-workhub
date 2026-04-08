"use client";

import { useState } from "react";
import {
  CalendarIcon,
  CheckSquareIcon,
  FolderIcon,
  LinkIcon,
  NoteIcon,
  RotateCcwIcon,
  TrashIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { useWorkHub } from "@/lib/work-hub-store";
import { formatDate } from "@/lib/utils";
import { WorkspaceData } from "@/lib/types";
import { cn } from "@/lib/utils";

type TrashType = keyof WorkspaceData["trash"];

export default function TrashPage() {
  const { data, user, restoreItem, permanentDeleteItem, emptyTrash } = useWorkHub();
  const [filter, setFilter] = useState<TrashType | "all">("all");

  const isVisible = (item: any) =>
    item.visibility !== "private" || item.ownerId === user?.uid || item.assigneeIds?.includes(user?.uid ?? "");

  const trashItems = [
    ...data.trash.tasks.filter(isVisible).map((item) => ({ ...item, type: "tasks" as TrashType })),
    ...data.trash.projects.filter(isVisible).map((item) => ({ ...item, type: "projects" as TrashType })),
    ...data.trash.notes.filter(isVisible).map((item) => ({ ...item, type: "notes" as TrashType })),
    ...data.trash.links.filter(isVisible).map((item) => ({ ...item, type: "links" as TrashType })),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const filteredItems = filter === "all" ? trashItems : trashItems.filter((i) => i.type === filter);

  const totalCount = trashItems.length;

  const iconMap = {
    tasks: <CheckSquareIcon className="h-4 w-4" />,
    projects: <FolderIcon className="h-4 w-4" />,
    notes: <NoteIcon className="h-4 w-4" />,
    links: <LinkIcon className="h-4 w-4" />,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow="Recycle Bin"
          title="Trash"
          description="Items kept here for safety. You can restore them to their original location or delete them permanently."
        />
        {totalCount > 0 && (
          <button
            onClick={() => {
              if (confirm("Are you sure you want to empty the trash? This cannot be undone.")) {
                emptyTrash();
              }
            }}
            className="flex items-center gap-2 rounded-2xl bg-[var(--warning-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--warning)] transition hover:bg-[var(--warning)] hover:text-white"
          >
            <TrashIcon className="h-4 w-4" />
            Empty trash
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "tasks", "projects", "notes", "links"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              filter === t
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "bg-[var(--surface-strong)] text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Surface key={item.id} className="group flex items-center justify-between p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--accent)]">
                  {iconMap[item.type]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--foreground)]">
                      {"title" in item ? item.title : "name" in item ? item.name : "Untitled"}
                    </h3>
                    <Badge tone="neutral" className="text-[10px] uppercase tracking-wider">
                      {item.type.slice(0, -1)}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Deleted around {formatDate(item.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => restoreItem(item.type, item.id)}
                  title="Restore"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-strong)] text-[var(--foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                >
                  <RotateCcwIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this item permanently?")) {
                      permanentDeleteItem(item.type, item.id);
                    }
                  }}
                  title="Delete permanently"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-strong)] text-[var(--warning)] transition hover:bg-[var(--warning)] hover:text-white"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </Surface>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-[var(--line)] py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--surface-strong)] text-[var(--muted)]">
              <TrashIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-semibold text-[var(--foreground)]">Trash is empty</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              When you delete items, they will appear here for a second chance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
