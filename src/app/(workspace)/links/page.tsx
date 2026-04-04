"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/forms/field";
import { LinkForm } from "@/components/forms/link-form";
import { CollectionToolbar } from "@/components/workspace/collection-toolbar";
import { EntityActions } from "@/components/workspace/entity-actions";
import { FormDialog } from "@/components/workspace/form-dialog";
import {
  ExternalLinkIcon,
  FilterIcon,
  LinkIcon,
  PlusIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";
import type { QuickLink } from "@/lib/types";
import { useWorkHub } from "@/lib/work-hub-store";
import { safeLower } from "@/lib/utils";

export default function QuickLinksPage() {
  const { data, user, userRole, searchQuery, createLink, updateLink, deleteLink } = useWorkHub();
  const isOwner = userRole === "owner";
  const [localSearch, setLocalSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<QuickLink | null>(null);

  const categories = Array.from(new Set(data.links.map((link) => link.category))).sort();
  const query = safeLower(`${searchQuery} ${localSearch}`.trim());
  const links = data.links.filter((link) => {
    const matchesQuery = query
      ? [link.title, link.url, link.category]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)
      : true;
    const matchesCategory =
      categoryFilter === "all" ? true : link.category === categoryFilter;

    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Access"
        title="Quick Links"
        description="Save the destinations you return to most so context is close and friction stays low."
        action={
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
            Save link
          </Button>
        }
      />

      <CollectionToolbar
        searchValue={localSearch}
        onSearchChange={setLocalSearch}
        searchPlaceholder="Search title, URL, or category"
        totalLabel="link"
        totalCount={links.length}
        hasActiveFilters={Boolean(localSearch || categoryFilter !== "all")}
        onReset={() => {
          setLocalSearch("");
          setCategoryFilter("all");
        }}
        filters={
          <Field label="Category">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        }
      />

      {data.links.length === 0 ? (
        <EmptyState
          icon={<LinkIcon className="h-5 w-5" />}
          title="No quick links yet"
          description="Save the pages you keep opening so the next step is one click away."
          action={
            <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
              Save your first link
            </Button>
          }
        />
      ) : links.length === 0 ? (
        <EmptyState
          icon={<FilterIcon className="h-5 w-5" />}
          title="No links match these filters"
          description="Try a different keyword or switch back to all categories."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {links.map((link) => (
            <Surface key={link.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">
                        {link.title}
                      </h2>
                      <Badge tone="accent">{link.category}</Badge>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-0 items-center gap-2 break-all text-sm text-[var(--accent)] hover:text-[var(--accent-strong)]"
                    >
                      {link.url}
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <EntityActions
                  onEdit={() => setEditingLink(link)}
                  onDelete={() => setLinkToDelete(link)}
                  canEdit={isOwner || link.ownerId === user?.uid}
                />
              </div>
            </Surface>
          ))}
        </div>
      )}

      <FormDialog
        open={isCreateOpen}
        mode="create"
        noun="link"
        createDescription="Keep a useful page close to the work."
        editDescription="Update the destination, label, or category."
        onClose={() => setIsCreateOpen(false)}
      >
        <LinkForm
          onSubmit={(value) => {
            createLink(value);
            setIsCreateOpen(false);
          }}
          onCancel={() => setIsCreateOpen(false)}
        />
      </FormDialog>

      <FormDialog
        open={Boolean(editingLink)}
        mode="edit"
        noun="link"
        createDescription="Keep a useful page close to the work."
        editDescription="Update the destination, label, or category."
        onClose={() => setEditingLink(null)}
      >
        {editingLink ? (
          <LinkForm
            initialValue={editingLink}
            onSubmit={(value) => {
              updateLink(editingLink.id, value);
              setEditingLink(null);
            }}
            onCancel={() => setEditingLink(null)}
          />
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(linkToDelete)}
        title="Delete link"
        description={`Delete "${linkToDelete?.title ?? "this link"}"?`}
        onCancel={() => setLinkToDelete(null)}
        onConfirm={() => {
          if (linkToDelete) {
            deleteLink(linkToDelete.id);
          }
          setLinkToDelete(null);
        }}
      />
    </div>
  );
}
