"use client";

import { useState } from "react";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QuickLink, QuickLinkDraft } from "@/lib/types";

type LinkFormProps = {
  initialValue?: QuickLink;
  onSubmit: (value: QuickLinkDraft) => void;
  onCancel: () => void;
};

export function LinkForm({ initialValue, onSubmit, onCancel }: LinkFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [url, setUrl] = useState(initialValue?.url ?? "");
  const [category, setCategory] = useState(initialValue?.category ?? "");
  const [errors, setErrors] = useState<{
    title?: string;
    url?: string;
    category?: string;
  }>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setErrors({ title: "A short title makes saved links easier to scan." });
      return;
    }

    try {
      new URL(url.trim());
    } catch {
      setErrors({ url: "Please enter a valid URL including https://" });
      return;
    }

    if (!category.trim()) {
      setErrors({ category: "Add a category so related links stay grouped." });
      return;
    }

    setErrors({});
    onSubmit({
      title: title.trim(),
      url: url.trim(),
      category: category.trim(),
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
            placeholder="Sprint board"
          />
        )}
      </Field>

      <Field
        label="URL"
        hint="Include the full address, including https://"
        error={errors.url}
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
          />
        )}
      </Field>

      <Field label="Category" error={errors.category}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Work, Personal, Learning"
          />
        )}
      </Field>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialValue ? "Save changes" : "Save link"}</Button>
      </div>
    </form>
  );
}
