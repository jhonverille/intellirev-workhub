"use client";

import {
  CalendarIcon,
  CheckSquareIcon,
  ClockIcon,
  FolderIcon,
  LinkIcon,
  LockIcon,
  NoteIcon,
  SparkIcon,
  UserIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Markdown } from "@/components/ui/markdown";
import { SummaryCard } from "@/components/ui/summary-card";
import { Surface } from "@/components/ui/surface";
import { ActivityFeed } from "@/components/workspace/activity-feed";
import { projectStatuses } from "@/lib/navigation";
import { getProjectStatusTone, getTaskStatusTone } from "@/lib/presentation";
import { useWorkHub } from "@/lib/work-hub-store";
import { formatDate, formatRelativeDate, sortByUpdatedAt } from "@/lib/utils";

export default function DashboardPage() {
  const { data, user, userRole, currentWorkspaceId, respondToAssignment } = useWorkHub();
  const invitationRequests = (data.assignmentRequests || []).filter(
    (r) => r.toId === user?.uid && r.status === "pending"
  );

  const viewableProjects = data.projects.filter(
    (p) => p.ownerId === user?.uid || p.assigneeIds?.includes(user?.uid ?? "")
  );
  const viewableTasks = data.tasks.filter(
    (t) => t.ownerId === user?.uid || t.assigneeIds?.includes(user?.uid ?? "")
  );
  const viewableNotes = data.notes.filter(
    (n) => n.visibility !== "private" || n.ownerId === user?.uid || n.assigneeIds?.includes(user?.uid ?? "")
  );
  const activeProjects = viewableProjects.filter((project) => project.status === "active");
  const focusTasks = [...viewableTasks]
    .filter((task) => !task.completed)
    .sort((left, right) => {
      if (left.priority === right.priority) {
        return (
          new Date(left.dueDate ?? 0).getTime() - new Date(right.dueDate ?? 0).getTime()
        );
      }

      const order = { high: 0, medium: 1, low: 2 };
      return order[left.priority] - order[right.priority];
    })
    .slice(0, 3);

  const recentTasks = sortByUpdatedAt(viewableTasks).slice(0, 4);
  const recentNotes = sortByUpdatedAt(viewableNotes).slice(0, 3);
  const projectsByStatus = projectStatuses.map((status) => ({
    status,
    count: viewableProjects.filter((project) => project.status === status).length,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title="Your work in one place"
        description="Keep momentum visible with today's focus, recent activity, and a quick read on the projects that still need attention."
      />
      
      {invitationRequests.length > 0 && (
        <Surface className="p-6 border-2 border-[var(--accent)] bg-[var(--accent-faint)]">
          <div className="flex items-center gap-3">
            <span className="rounded-3xl bg-[var(--accent)] p-3 text-white shadow-sm ring-4 ring-[var(--accent-faint)]">
              <UserIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                Collaboration Invitations
              </h2>
              <p className="text-sm text-[var(--muted)]">
                New projects or tasks have been shared with you. Accept them to add to your workspace.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {invitationRequests.map((req) => (
              <div 
                key={req.id} 
                className="flex items-center justify-between gap-4 p-4 rounded-[20px] bg-[var(--surface)] border border-[var(--line)] shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-faint)] px-2 py-0.5 rounded">
                      {req.itemType}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">from {req.fromName}</span>
                  </div>
                  <p className="font-semibold text-[var(--foreground)] truncate">{req.itemName}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => respondToAssignment(req.id, "accepted")}
                    className="h-8 px-3 rounded-full bg-[var(--accent)] text-xs font-bold text-white hover:scale-105 transition active:scale-95 shadow-lg shadow-[var(--accent-faint)]"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => respondToAssignment(req.id, "declined")}
                    className="h-8 px-3 rounded-full bg-[var(--surface-strong)] text-xs font-bold text-[var(--muted)] hover:bg-[var(--line)] transition active:scale-95"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total tasks"
          value={String(viewableTasks.length)}
          meta={`${viewableTasks.filter((task) => !task.completed).length} still in motion`}
          icon={<CheckSquareIcon />}
        />
        <SummaryCard
          label="Active projects"
          value={String(activeProjects.length)}
          meta={`${viewableProjects.length} tracked in total`}
          icon={<FolderIcon />}
        />
        <SummaryCard
          label="Notes"
          value={String(viewableNotes.length)}
          meta="Reference and reflection together"
          icon={<NoteIcon />}
        />
        <SummaryCard
          label="Saved links"
          value={String(data.links.length)}
          meta="Frequent destinations kept close"
          icon={<LinkIcon />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface className="p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-3xl bg-[var(--surface-strong)] p-3 text-[var(--accent)]">
              <SparkIcon />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                Today&apos;s focus
              </h2>
              <p className="text-sm text-[var(--muted)]">
                The next few items worth protecting time for.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {focusTasks.length ? (
              focusTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={getTaskStatusTone(task.status)}>{task.status}</Badge>
                    {task.dueDate ? (
                      <Badge tone="neutral">
                        {formatRelativeDate(task.dueDate)}
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                    {task.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {task.description || "No extra context yet."}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
                Nothing urgent is demanding your attention right now. That is a good
                sign.
              </div>
            )}
          </div>
        </Surface>

        <Surface className="p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-3xl bg-[var(--surface-strong)] p-3 text-[var(--accent)]">
              <CalendarIcon />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                Project status
              </h2>
              <p className="text-sm text-[var(--muted)]">
                A quick pulse check on what is planned, active, paused, or done.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {projectsByStatus.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge tone={getProjectStatusTone(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <span className="font-semibold text-[var(--foreground)]">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-strong)]">
                  <div
                    className="h-2 rounded-full bg-[var(--accent)]"
                    style={{
                      width: `${viewableProjects.length ? (item.count / viewableProjects.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Surface className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                Recent tasks
              </h2>
              <p className="text-sm text-[var(--muted)]">
                The latest movement across your task list.
              </p>
            </div>
            <ClockIcon className="text-[var(--accent)]" />
          </div>
          <div className="mt-5 space-y-4">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-[24px] border border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--foreground)]">{task.title}</p>
                      {task.visibility === "private" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--warning)]">
                          <LockIcon className="h-3 w-3" />
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Updated {formatRelativeDate(task.updatedAt)}
                    </p>
                  </div>
                <Badge tone={getTaskStatusTone(task.status)}>{task.status}</Badge>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                Recent notes
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Fresh context from the notes you updated most recently.
              </p>
            </div>
            <NoteIcon className="text-[var(--accent)]" />
          </div>
          <div className="mt-5 space-y-4">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-[24px] border border-[var(--line)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--foreground)]">{note.title}</p>
                      {note.visibility === "private" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--warning)]">
                          <LockIcon className="h-3 w-3" />
                          Private
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-[var(--muted)]">
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                <Markdown 
                  content={note.content} 
                  className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]" 
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {note.tags.map((tag) => (
                    <Badge key={tag} tone="accent">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      {currentWorkspaceId && (
        <section>
          <Surface className="p-6">
            <ActivityFeed workspaceId={currentWorkspaceId} />
          </Surface>
        </section>
      )}
    </div>
  );
}
