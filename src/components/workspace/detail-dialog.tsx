"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, LockIcon, UserIcon, ClockIcon } from "@/components/icons";
import { useWorkHub } from "@/lib/work-hub-store";
import { formatDate, makeId } from "@/lib/utils";
import { getProjectStatusTone, getTaskStatusTone, getTaskPriorityTone } from "@/lib/presentation";
import type { ItemUpdate, Project, Task, Note } from "@/lib/types";

type DetailDialogProps = {
  open: boolean;
  onClose: () => void;
  itemType: "project" | "task" | "note";
  itemId: string | null;
};

export function DetailDialog({ open, onClose, itemType, itemId }: DetailDialogProps) {
  const { data, user, updateProject, updateTask, updateNote } = useWorkHub();
  const [updateContent, setUpdateContent] = useState("");

  if (!open || !itemId) return null;

  // 1. Retrieve the specific item
  let item: Project | Task | Note | undefined;
  if (itemType === "project") {
    item = data.projects.find((p) => p.id === itemId);
  } else if (itemType === "task") {
    item = data.tasks.find((t) => t.id === itemId);
  } else if (itemType === "note") {
    item = data.notes.find((n) => n.id === itemId);
  }

  if (!item) return null;

  // 2. Resolve Creator (Owner) and Members
  const owner = data.members?.[item.ownerId || ""];
  const isOwner = item.ownerId === user?.uid;
  const isAssignee = item.assigneeIds?.includes(user?.uid || "");
  const canPostUpdate = isOwner || isAssignee;

  // 3. Resolve title & description & deadline
  const title = itemType === "project" ? (item as Project).name : (item as Task | Note).title;
  const description = itemType === "note" ? (item as Note).content : (item as Project | Task).description;
  const deadline = itemType === "project" ? (item as Project).deadline : itemType === "task" ? (item as Task).dueDate : undefined;

  // 4. Handle posting a new update
  const handlePostUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateContent.trim() || !user) return;

    const newUpdate: ItemUpdate = {
      id: makeId(),
      authorId: user.uid,
      authorName: user.displayName || user.email || "Workspace Member",
      authorPhotoURL: user.photoURL,
      content: updateContent.trim(),
      createdAt: new Date().toISOString(),
    };

    const currentUpdates = item.updates || [];
    const updatedList = [...currentUpdates, newUpdate];

    if (itemType === "project") {
      updateProject(itemId, {
        ...(item as Project),
        updates: updatedList,
      });
    } else if (itemType === "task") {
      updateTask(itemId, {
        ...(item as Task),
        updates: updatedList,
      });
    } else if (itemType === "note") {
      updateNote(itemId, {
        ...(item as Note),
        updates: updatedList,
      });
    }

    setUpdateContent("");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      description={`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Details & Collaboration Thread`}
    >
      <div className="space-y-6">
        {/* Meta / Metadata Row */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] pb-5">
          <Badge tone={itemType === "project" ? "accent" : itemType === "task" ? "warning" : "success"}>
            {itemType.toUpperCase()}
          </Badge>

          {itemType === "project" && (
            <Badge tone={getProjectStatusTone((item as Project).status)}>
              {(item as Project).status}
            </Badge>
          )}

          {itemType === "task" && (
            <>
              <Badge tone={getTaskStatusTone((item as Task).status)}>
                {(item as Task).status}
              </Badge>
              <Badge tone={getTaskPriorityTone((item as Task).priority)}>
                {`${(item as Task).priority} priority`}
              </Badge>
            </>
          )}

          {item.visibility === "private" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warning)]">
              <LockIcon className="h-3.5 w-3.5" />
              Private Item
            </span>
          )}

          {itemType !== "note" && deadline && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <CalendarIcon className="h-4 w-4" />
              Due: {formatDate(deadline)}
            </span>
          )}
        </div>

        {/* Description / Content Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            {itemType === "note" ? "Content" : "Description"}
          </h4>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-4 text-sm leading-6 text-[var(--foreground)] border border-[var(--line)] whitespace-pre-wrap">
            {description || <span className="italic text-[var(--muted)]">No description provided.</span>}
          </div>
        </div>

        {/* Assigned Team Members Row */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Collaborators
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            {/* Creator / Owner */}
            <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-strong)] px-3 py-1.5 border border-[var(--line)]">
              {owner?.photoURL ? (
                <img
                  src={owner.photoURL}
                  alt={owner.displayName || "Owner"}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white uppercase">
                  {owner?.displayName?.charAt(0) || owner?.email?.charAt(0) || "O"}
                </div>
              )}
              <span className="text-xs font-medium text-[var(--foreground)]">
                {owner?.displayName || owner?.email || "Unknown Owner"}
              </span>
              <span className="text-[10px] font-semibold text-[var(--brand)] uppercase tracking-wider bg-[var(--brand-soft)] px-1.5 py-0.2 rounded">
                Creator
              </span>
            </div>

            {/* Assignees */}
            {item.assigneeIds?.map((assigneeId) => {
              const member = data.members?.[assigneeId];
              if (!member) return null;
              return (
                <div
                  key={assigneeId}
                  className="flex items-center gap-2 rounded-xl bg-[var(--surface-strong)] px-3 py-1.5 border border-[var(--line)]"
                >
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt={member.displayName || "Assignee"}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white uppercase">
                      {member.displayName?.charAt(0) || member.email?.charAt(0) || "A"}
                    </div>
                  )}
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {member.displayName || member.email}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider bg-[var(--surface)] px-1.5 py-0.2 rounded">
                    Assignee
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Updates Log / History Section */}
        <div className="border-t border-[var(--line)] pt-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Updates Log ({item.updates?.length || 0})
          </h4>

          {/* Scrollable Thread */}
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {!item.updates || item.updates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-[var(--muted)] bg-[var(--surface-strong)] rounded-2xl border border-dashed border-[var(--line)]">
                <ClockIcon className="h-8 w-8 text-[var(--muted)] mb-2 opacity-50" />
                <p className="text-sm font-medium">No updates posted yet</p>
                <p className="text-xs max-w-sm mt-1">
                  Keep workspace collaborators aligned by posting your progress or updates.
                </p>
              </div>
            ) : (
              item.updates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-start gap-3 rounded-2xl bg-[var(--surface-strong)] p-4 border border-[var(--line)] shadow-sm hover:border-[var(--brand)] transition-colors duration-200"
                >
                  {update.authorPhotoURL ? (
                    <img
                      src={update.authorPhotoURL}
                      alt={update.authorName}
                      className="h-8 w-8 rounded-full object-cover border border-[var(--line)] mt-0.5"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white uppercase border border-[var(--line)] mt-0.5">
                      {update.authorName.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {update.authorName}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {formatDate(update.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap break-words">
                      {update.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Post New Update Section */}
          <div className="pt-2">
            {canPostUpdate ? (
              <form onSubmit={handlePostUpdate} className="space-y-3">
                <Textarea
                  placeholder="Share progress, blockages, or other updates about this item..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  rows={3}
                  className="bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-2xl p-3 resize-none text-sm text-[var(--foreground)]"
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    Post update
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl bg-[var(--warning-soft)] p-3 border border-[var(--line)] text-center">
                <p className="text-xs font-medium text-[var(--warning)]">
                  Only the creator and assigned team members can post updates on this item.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
