"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ActivityIcon } from "@/components/icons";
import type { ActivityEvent } from "@/lib/types";

type ActivityFeedProps = {
  workspaceId: string;
};

const actionVerb: Record<ActivityEvent["action"], string> = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  completed: "completed",
};

const entityEmoji: Record<ActivityEvent["entityType"], string> = {
  project: "📁",
  task: "✅",
  note: "📝",
  link: "🔗",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ActivityFeed({ workspaceId }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    const q = query(
      collection(db, "workspaces", workspaceId, "activity"),
      orderBy("timestamp", "desc"),
      limit(20),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ActivityEvent, "id">),
        }));
        setEvents(items);
        setLoading(false);
      },
      (err) => {
        console.warn("[ActivityFeed] Firestore error:", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [workspaceId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ActivityIcon className="h-4 w-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--muted)]">
          Activity
        </h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-2xl bg-[var(--surface-strong)]"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--line)] p-4 text-center text-sm text-[var(--muted)]">
          No activity yet. Start by creating a project or note!
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm transition hover:bg-[var(--surface-strong)]"
            >
              {/* Avatar or emoji fallback */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                {event.userPhotoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.userPhotoURL}
                    alt={event.userDisplayName}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  event.userDisplayName.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate leading-snug text-[var(--foreground)]">
                  <span className="font-semibold">{event.userDisplayName}</span>{" "}
                  {actionVerb[event.action]}{" "}
                  <span className="font-medium">
                    {entityEmoji[event.entityType]} {event.entityName}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {timeAgo(event.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
