"use client";

import { useState } from "react";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { projectStatuses } from "@/lib/navigation";
import type { Project, ProjectDraft, Member } from "@/lib/types";
import { fromDateInputValue, toDateInputValue } from "@/lib/utils";

type ProjectFormProps = {
  initialValue?: Project;
  members: Member[];
  onSubmit: (value: ProjectDraft) => void;
  onCancel: () => void;
};

export function ProjectForm({
  initialValue,
  members,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [description, setDescription] = useState(initialValue?.description ?? "");
  const [status, setStatus] = useState<ProjectDraft["status"]>(
    initialValue?.status ?? "planned",
  );
  const [deadline, setDeadline] = useState(
    toDateInputValue(initialValue?.deadline ?? null),
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialValue?.assigneeIds ?? []);
  const [visibility, setVisibility] = useState<"public" | "private">(initialValue?.visibility ?? "public");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Projects need a clear name so they stay easy to scan.");
      return;
    }

    setError("");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      status,
      deadline: fromDateInputValue(deadline),
      assigneeIds,
      visibility,
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Field label="Name" error={error || undefined}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            data-autofocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Launch personal dashboard refresh"
          />
        )}
      </Field>

      <Field
        label="Description"
        hint="Add the purpose and the current shape of the work."
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Capture the purpose, constraints, and the next meaningful milestone."
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ProjectDraft["status"])
              }
            >
              {projectStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Deadline">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          )}
        </Field>
        
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

      <Field label="Assignees" hint="Select team members to assign to this project.">
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
        <Button type="submit">
          {initialValue ? "Save changes" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
