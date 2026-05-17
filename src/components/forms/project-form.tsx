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
import { useWorkHub } from "@/lib/work-hub-store";

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
  const { 
    requestAssignment, 
    user,
    data: { assignmentRequests = [] } 
  } = useWorkHub();
  const id = initialValue?.id;
  const [name, setName] = useState(initialValue?.name ?? "");
  const [description, setDescription] = useState(initialValue?.description ?? "");
  const [status, setStatus] = useState<ProjectDraft["status"]>(
    initialValue?.status ?? "planned",
  );
  const [deadline, setDeadline] = useState(
    toDateInputValue(initialValue?.deadline ?? null),
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialValue?.assigneeIds ?? []);
  const [visibility, setVisibility] = useState<"public" | "private">(initialValue?.visibility ?? "private");
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
                        onClick={() => id && requestAssignment(id, "project", name, member.uid)}
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
        <Button type="submit">
          {initialValue ? "Save changes" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
