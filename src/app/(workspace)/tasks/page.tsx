"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/forms/field";
import { TaskForm } from "@/components/forms/task-form";
import { CollectionToolbar } from "@/components/workspace/collection-toolbar";
import { EntityActions } from "@/components/workspace/entity-actions";
import { FormDialog } from "@/components/workspace/form-dialog";
import {
  CalendarIcon,
  CheckIcon,
  CheckSquareIcon,
  FilterIcon,
  PlusIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";
import { getTaskPriorityTone, getTaskStatusTone } from "@/lib/presentation";
import type { Task } from "@/lib/types";
import { useWorkHub } from "@/lib/work-hub-store";
import { formatDate, isOverdue, safeLower } from "@/lib/utils";

export default function TasksPage() {
  const {
    data,
    user,
    searchQuery,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
  } = useWorkHub();
  const [localSearch, setLocalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const isOwner = user?.uid === data.ownerId;
  const viewableTasks = isOwner ? data.tasks : data.tasks.filter(t => t.assigneeIds?.includes(user?.uid ?? ""));

  const query = safeLower(`${searchQuery} ${localSearch}`.trim());
  const tasks = viewableTasks.filter((task) => {
    const matchesQuery = query
      ? [task.title, task.description]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)
      : true;
    const matchesStatus = statusFilter === "all" ? true : task.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" ? true : task.priority === priorityFilter;
    const showCompleted = data.settings.preferences.showCompletedTasks || !task.completed;

    return matchesQuery && matchesStatus && matchesPriority && showCompleted;
  });

  const spacing = data.settings.preferences.compactMode ? "gap-3" : "gap-4";

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Execution"
        title="Tasks"
        description="Track what is next, what is blocked, and what is finished without losing the shape of the day."
        action={
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
            New task
          </Button>
        }
      />

      <CollectionToolbar
        searchValue={localSearch}
        onSearchChange={setLocalSearch}
        searchPlaceholder="Search title or description"
        totalLabel="task"
        totalCount={tasks.length}
        hasActiveFilters={Boolean(localSearch || statusFilter !== "all" || priorityFilter !== "all")}
        onReset={() => {
          setLocalSearch("");
          setStatusFilter("all");
          setPriorityFilter("all");
        }}
        filters={
          <>
            <Field label="Status">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="to do">To do</option>
                  <option value="in progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </Select>
              )}
            </Field>
            <Field label="Priority">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                >
                  <option value="all">All priorities</option>
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                </Select>
              )}
            </Field>
          </>
        }
      />

      {viewableTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquareIcon className="h-5 w-5" />}
          title="No tasks yet"
          description="Start with one clear next action. The rest of the system gets easier once something real is on the board."
          action={
            <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
              Create your first task
            </Button>
          }
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<FilterIcon className="h-5 w-5" />}
          title="No tasks match these filters"
          description="Try clearing a filter or broadening the search to bring hidden tasks back into view."
        />
      ) : (
        <div className={`grid ${spacing}`}>
          {tasks.map((task) => {
            const project = data.projects.find((item) => item.id === task.projectId);

            return (
              <Surface key={task.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-1 gap-4">
                    <button
                      onClick={() => toggleTaskCompletion(task.id)}
                      aria-pressed={task.completed}
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                        task.completed
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                          : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--muted)]"
                      }`}
                      aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {task.completed ? <CheckIcon className="h-4 w-4" /> : null}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">
                          {task.title}
                        </h2>
                        <Badge tone={getTaskStatusTone(task.status)}>{task.status}</Badge>
                        <Badge tone={getTaskPriorityTone(task.priority)}>
                          {task.priority}
                        </Badge>
                        {project ? <Badge tone="neutral">{project.name}</Badge> : null}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                        {task.description || "No extra context yet."}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                        <span className="inline-flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                        </span>
                        {isOverdue(task.dueDate) && !task.completed ? (
                          <span className="rounded-full bg-[var(--danger-soft)] px-3 py-1 text-xs font-semibold text-[var(--danger)]">
                            Overdue
                          </span>
                        ) : null}
                        {task.assigneeIds?.length > 0 && (
                          <span className="rounded-full bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold">
                            {task.assigneeIds.length} Assignee{task.assigneeIds.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <EntityActions
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => setTaskToDelete(task)}
                  />
                </div>
              </Surface>
            );
          })}
        </div>
      )}

      <FormDialog
        open={isCreateOpen}
        mode="create"
        noun="task"
        createDescription="Add a task with enough detail to make the next move obvious."
        editDescription="Update status, due date, or details without losing context."
        onClose={() => setIsCreateOpen(false)}
      >
        <TaskForm
          projects={data.projects}
          members={Object.values(data.members || {})}
          onSubmit={(value) => {
            createTask(value);
            setIsCreateOpen(false);
          }}
          onCancel={() => setIsCreateOpen(false)}
        />
      </FormDialog>

      <FormDialog
        open={Boolean(editingTask)}
        mode="edit"
        noun="task"
        createDescription="Add a task with enough detail to make the next move obvious."
        editDescription="Update status, due date, or details without losing context."
        onClose={() => setEditingTask(null)}
      >
        {editingTask ? (
          <TaskForm
            initialValue={editingTask}
            projects={data.projects}
            members={Object.values(data.members || {})}
            onSubmit={(value) => {
              updateTask(editingTask.id, value);
              setEditingTask(null);
            }}
            onCancel={() => setEditingTask(null)}
          />
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="Delete task"
        description={`Delete "${taskToDelete?.title ?? "this task"}"?`}
        onCancel={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.id);
          }
          setTaskToDelete(null);
        }}
      />
    </div>
  );
}
