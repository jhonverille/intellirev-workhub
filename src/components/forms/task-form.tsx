"use client";

import { useState } from "react";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { taskPriorities, taskStatuses } from "@/lib/navigation";
import type { Project, Task, TaskDraft, Member } from "@/lib/types";
import { fromDateInputValue, toDateInputValue } from "@/lib/utils";

type TaskFormProps = {
  initialValue?: Task;
  projects: Project[];
  members: Member[];
  onSubmit: (value: TaskDraft) => void;
  onCancel: () => void;
};

export function TaskForm({ initialValue, projects, members, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [description, setDescription] = useState(initialValue?.description ?? "");
  const [priority, setPriority] = useState<TaskDraft["priority"]>(
    initialValue?.priority ?? "medium",
  );
  const [status, setStatus] = useState<TaskDraft["status"]>(
    initialValue?.status ?? "to do",
  );
  const [dueDate, setDueDate] = useState(toDateInputValue(initialValue?.dueDate ?? null));
  const [projectId, setProjectId] = useState(initialValue?.projectId ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialValue?.assigneeIds ?? []);
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("A task title helps you spot the next action quickly.");
      return;
    }

    setError("");
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      dueDate: fromDateInputValue(dueDate),
      projectId: projectId || null,
      completed: status === "done",
      assigneeIds,
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Field label="Title" error={error || undefined}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            data-autofocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Review roadmap and tighten priorities"
          />
        )}
      </Field>

      <Field
        label="Description"
        hint="Optional context that makes the task easier to pick up later."
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add context, blockers, or details that make this easier to pick up later."
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Priority">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskDraft["priority"])
              }
            >
              {taskPriorities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Status">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskDraft["status"])}
            >
              {taskStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due date">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          )}
        </Field>

        <Field label="Project">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Assignees" hint="Select team members to assign to this task.">
        {() => (
          <div className="grid gap-2 sm:grid-cols-2 mt-2">
            {members.length === 0 && (
              <p className="text-sm text-[var(--muted)] col-span-2">No members in workspace.</p>
            )}
            {members.map((member) => (
              <label key={member.uid} className="flex flex-1 items-center gap-3 text-sm cursor-pointer p-2.5 rounded-xl hover:bg-[var(--surface-strong)] transition border border-[var(--line)]">
                <input
                  type="checkbox"
                  checked={assigneeIds.includes(member.uid)}
                  onChange={(e) => {
                    if (e.target.checked) setAssigneeIds([...assigneeIds, member.uid]);
                    else setAssigneeIds(assigneeIds.filter((id) => id !== member.uid));
                  }}
                  className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                />
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="truncate font-medium">{member.displayName || "Unknown User"}</span>
                  <span className="truncate text-[10px] text-[var(--muted)]">{member.email}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </Field>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialValue ? "Save changes" : "Create task"}</Button>
      </div>
    </form>
  );
}
