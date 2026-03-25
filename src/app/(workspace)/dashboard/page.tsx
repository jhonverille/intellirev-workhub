"use client";

import {
  CalendarIcon,
  CheckSquareIcon,
  ClockIcon,
  FolderIcon,
  LinkIcon,
  NoteIcon,
  SparkIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Markdown } from "@/components/ui/markdown";
import { SummaryCard } from "@/components/ui/summary-card";
import { Surface } from "@/components/ui/surface";
import { projectStatuses } from "@/lib/navigation";
import { getProjectStatusTone, getTaskStatusTone } from "@/lib/presentation";
import { useWorkHub } from "@/lib/work-hub-store";
import { formatDate, formatRelativeDate, sortByUpdatedAt } from "@/lib/utils";

export default function DashboardPage() {
  const { data, user } = useWorkHub();

  const isOwner = user?.uid === data.ownerId;
  const viewableProjects = isOwner ? data.projects : data.projects.filter(p => p.assigneeIds?.includes(user?.uid ?? ""));
  const viewableTasks = isOwner ? data.tasks : data.tasks.filter(t => t.assigneeIds?.includes(user?.uid ?? ""));

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
  const recentNotes = sortByUpdatedAt(data.notes).slice(0, 3);
  const projectsByStatus = projectStatuses.map((status) => ({
    status,
    count: viewableProjects.filter((project) => project.status === status).length,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title="Your work in one place"
        description="Keep momentum visible with today’s focus, recent activity, and a quick read on the projects that still need attention."
      />

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
          value={String(data.notes.length)}
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
                  <p className="font-semibold text-[var(--foreground)]">{task.title}</p>
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
                  <p className="font-semibold text-[var(--foreground)]">{note.title}</p>
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
    </div>
  );
}
