import { useState, useRef } from "react";
import { Field } from "@/components/forms/field";
import { EyeIcon, PencilIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";
import { RichTextToolbar } from "@/components/ui/rich-text-toolbar";
import { cn, normalizeTags } from "@/lib/utils";
import type { Member, Note, NoteDraft } from "@/lib/types";

type NoteFormProps = {
  initialValue?: Note;
  members?: Member[];
  onSubmit: (value: NoteDraft) => void;
  onCancel: () => void;
};

export function NoteForm({ initialValue, members = [], onSubmit, onCancel }: NoteFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [content, setContent] = useState(initialValue?.content ?? "");
  const [tags, setTags] = useState(initialValue?.tags.join(", ") ?? "");
  const [visibility, setVisibility] = useState<"public" | "private">(initialValue?.visibility ?? "public");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialValue?.assigneeIds ?? []);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setErrors({ title: "A note title makes it much easier to find later." });
      return;
    }

    if (!content.trim()) {
      setErrors({
        content: "Add a little content so the note is useful when you return.",
      });
      return;
    }

    setErrors({});
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      tags: normalizeTags(tags),
      visibility,
      assigneeIds,
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Field label="Title" error={errors.title}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            data-autofocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ideas for a calmer weekly reset"
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tags" hint="Comma-separated tags are easiest to search later.">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="planning, review, systems"
            />
          )}
        </Field>

        <Field label="Privacy" hint="Private notes are only visible to you and assignees.">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as "public" | "private")}
            >
              <option value="public">Public (Workspace)</option>
              <option value="private">Private (You + Assignees)</option>
            </Select>
          )}
        </Field>
      </div>

      {members.length > 0 && (
        <Field label="Share with" hint="Assignees can view this note even if it's private.">
          {() => (
            <div className="grid gap-2 sm:grid-cols-2 mt-2">
              {members.map((member) => (
                <label
                  key={member.uid}
                  className="flex flex-1 items-center gap-3 text-sm cursor-pointer p-2.5 rounded-xl hover:bg-[var(--surface-strong)] transition border border-[var(--line)]"
                >
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
      )}

      <Field
        label="Content"
        error={errors.content}
        action={
          <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-strong)] p-1">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition",
                mode === "edit"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition",
                mode === "preview"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <EyeIcon className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        }
      >
        {(fieldProps) =>
          mode === "edit" ? (
            <div className="space-y-2">
              <RichTextToolbar
                textareaRef={textareaRef}
                value={content}
                onChange={setContent}
              />
              <Textarea
                {...fieldProps}
                ref={textareaRef}
                className="min-h-52"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write the note in Markdown. Use the toolbar above or type # for headers, - for lists, etc."
              />
            </div>
          ) : (
            <div
              {...fieldProps}
              className="min-h-52 rounded-2xl bg-[var(--surface-strong)] p-4 ring-1 ring-[var(--line)]"
            >
              {content.trim() ? (
                <Markdown content={content} />
              ) : (
                <p className="text-sm italic text-[var(--muted)]">
                  Nothing to preview yet.
                </p>
              )}
            </div>
          )
        }
      </Field>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialValue ? "Save changes" : "Create note"}</Button>
      </div>
    </form>
  );
}
