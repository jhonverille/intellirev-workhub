import { LockIcon, UserIcon } from "@/components/icons";
import type { Member } from "@/lib/types";

type AttributionRowProps = {
  ownerId?: string;
  assigneeIds?: string[];
  createdAt: string;
  isPrivate?: boolean;
  members: Record<string, Member>;
};

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 14) return `${diffDays} days ago`;

  // Absolute date for older items
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AssigneeAvatars({
  assigneeIds,
  members,
}: {
  assigneeIds: string[];
  members: Record<string, Member>;
}) {
  const visible = assigneeIds.slice(0, 3);
  const extra = assigneeIds.length - visible.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((id) => {
          const member = members[id];
          const initials = member?.displayName
            ? member.displayName[0].toUpperCase()
            : member?.email?.[0]?.toUpperCase() ?? "?";
          return (
            <div
              key={id}
              title={member?.displayName ?? member?.email ?? id}
              className="h-5 w-5 rounded-full bg-[var(--accent-muted)] border border-[var(--background)] flex items-center justify-center text-[8px] font-bold text-[var(--accent)]"
            >
              {initials}
            </div>
          );
        })}
      </div>
      {extra > 0 && (
        <span className="ml-1 text-[10px] text-[var(--muted)]">+{extra}</span>
      )}
    </div>
  );
}

export function AttributionRow({
  ownerId,
  assigneeIds = [],
  createdAt,
  isPrivate = false,
  members,
}: AttributionRowProps) {
  const creator = ownerId ? members[ownerId] : null;
  const creatorName = creator?.displayName ?? creator?.email ?? "Unknown";
  const hasAssignees = assigneeIds.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 mt-2 border-t border-[var(--line)] text-xs text-[var(--muted)]">
      {isPrivate && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warning)]">
          <LockIcon className="h-3 w-3" />
          Private
        </span>
      )}

      <span className="inline-flex items-center gap-1">
        <UserIcon className="h-3 w-3 shrink-0" />
        <span>
          By{" "}
          <span className="font-medium text-[var(--foreground)]">{creatorName}</span>
          {" · "}
          {relativeDate(createdAt)}
        </span>
      </span>

      {hasAssignees && (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[var(--muted)]">Assigned:</span>
          <AssigneeAvatars assigneeIds={assigneeIds} members={members} />
        </span>
      )}
    </div>
  );
}
