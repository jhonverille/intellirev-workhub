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
import { useWorkHub } from "@/lib/work-hub-store";

type TaskFormProps = {
  initialValue?: Task;
  projects: Project[];
  members: Member[];
  onSubmit: (value: TaskDraft) => void;
  onCancel: () => void;
};

export function TaskForm({ initialValue, projects, members, onSubmit, onCancel }: TaskFormProps) {
  const { 
    requestAssignment, 
    user,
    data: { assignmentRequests = [] } 
  } = useWorkHub();
  const id = initialValue?.id;
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
  const [visibility, setVisibility] = useState<"public" | "private">(initialValue?.visibility ?? "private");
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
      visibility,
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Privacy">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as "public" | "private")}
            >
              <option value="public">Public (Workspace)</option>
              <option value="private">Private (Only You)</option>
            </Select>
          )}
        </Field>
      </div>

      <Field label="Assignees" hint="Select team members to assign to this task.">
          {() => (
            <div className="grid gap-2 sm:grid-cols-2 mt-2">
              {members.filter((m) => m.uid !== user?.uid).length === 0 && (
                <p className="text-sm text-[var(--muted)] col-span-2">No other team members to assign.</p>
              )}
              {members.filter((m) => m.uid !== user?.uid).map((member) => {
                const isAssigned = assigneeIds.includes(member.uid);
                const pendingRequest = assignmentRequests.find(
                  (r) => r.toId === member.uid && r.itemId === id && r.status === "pending"
                );

                return (
                  <div key={member.uid} className="flex items-center justify-between gap-3 text-sm p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="truncate font-medium">{member.displayName || "Unknown User"}</span>
                      <span className="truncate text-[10px] text-[var(--muted)]">{member.email}</span>
                    </div>
                    
                    {isAssigned ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)] bg-[var(--success-faint)] px-2 py-1 rounded">Assigned</span>
                    ) : pendingRequest ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-faint)] px-2 py-1 rounded">Pending</span>
                    ) : (
                      <Button 
                        size="xs" 
                        variant="soft"
                        disabled={!id}
                        onClick={() => id && requestAssignment(id, "task", title, member.uid)}
                      >
                        {id ? "Request" : "Save First"}
                      </Button>
                    )}
                  </div>
                );
              })}
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
