"use client";

import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActions } from "@/components/workspace/bulk-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NoteForm } from "@/components/forms/note-form";
import { CollectionToolbar } from "@/components/workspace/collection-toolbar";
import { EntityActions } from "@/components/workspace/entity-actions";
import { FormDialog } from "@/components/workspace/form-dialog";
import {
  FilterIcon,
  LockIcon,
  NoteIcon,
  PlusIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { Markdown } from "@/components/ui/markdown";
import type { Note } from "@/lib/types";
import { useWorkHub } from "@/lib/work-hub-store";
import { formatDate, safeLower, sortByUpdatedAt } from "@/lib/utils";
import { AttributionRow } from "@/components/workspace/attribution-row";

export default function NotesPage() {
  const { data, user, userRole, searchQuery, createNote, updateNote, deleteNotes } = useWorkHub();
  const isOwner = userRole === "owner";
  const members = Object.values(data.members || {}).filter(m => m.uid !== user?.uid);
  const [localSearch, setLocalSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const query = safeLower(`${searchQuery} ${localSearch}`.trim());
  const notes = sortByUpdatedAt(data.notes).filter((note) => {
    const haystack = [note.title, note.content, note.tags.join(" ")].join(" ");
    return query ? haystack.toLocaleLowerCase().includes(query) : true;
  });

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === notes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notes.map((n) => n.id)));
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Reference"
        title="Notes"
        description="Capture ideas, decisions, and useful context in a format that stays easy to revisit."
        action={
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
            New note
          </Button>
        }
      />

      <CollectionToolbar
        searchValue={localSearch}
        onSearchChange={setLocalSearch}
        searchPlaceholder="Search titles, content, or tags"
        totalLabel="note"
        totalCount={notes.length}
        hasActiveFilters={Boolean(localSearch)}
        onReset={() => setLocalSearch("")}
      />

      {notes.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={selectedIds.size === notes.length && notes.length > 0}
            onChange={toggleAll}
          />
          <span className="text-sm font-medium text-[var(--muted)]">Select all visible</span>
        </div>
      )}

      {data.notes.length === 0 ? (
        <EmptyState
          icon={<NoteIcon className="h-5 w-5" />}
          title="No notes yet"
          description="Keep reusable ideas, questions, and context close to the work instead of spread across tabs and documents."
          action={
            <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
              Create your first note
            </Button>
          }
        />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<FilterIcon className="h-5 w-5" />}
          title="No notes match that search"
          description="Try fewer keywords or search for a tag to bring more notes into view."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {notes.map((note) => (
            <Surface key={note.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedIds.has(note.id)}
                      onChange={() => toggleSelection(note.id)}
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">
                        {note.title}
                      </h2>
                      {note.visibility === "private" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warning)]">
                          <LockIcon className="h-3 w-3" />
                          Private
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Updated {formatDate(note.updatedAt)}
                    </p>
                  </div>
                  <Markdown 
                    content={note.content} 
                    className="text-sm leading-7 text-[var(--muted)]" 
                  />
                  <div className="flex flex-wrap gap-2">
                    {note.tags.length ? (
                      note.tags.map((tag) => (
                        <Badge key={tag} tone="accent">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <Badge tone="neutral">No tags</Badge>
                    )}
                  </div>

                  <AttributionRow
                    ownerId={note.ownerId}
                    assigneeIds={note.assigneeIds}
                    createdAt={note.createdAt}
                    isPrivate={note.visibility === "private"}
                    members={data.members || {}}
                  />
                </div>

                  <EntityActions
                    onEdit={() => setEditingNote(note)}
                    onDelete={() => {
                      setSelectedIds(new Set([note.id]));
                      setIsBulkDeleteOpen(true);
                    }}
                    canEdit={note.ownerId === user?.uid}
                  />
                </div>
              </div>
            </Surface>
          ))}
        </div>
      )}

      <BulkActions
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setIsBulkDeleteOpen(true)}
        noun="note"
      />

      <FormDialog
        open={isCreateOpen}
        mode="create"
        noun="note"
        createDescription="Write it once in a place you can quickly come back to."
        editDescription="Keep the note readable and easy to search later."
        size="lg"
        onClose={() => setIsCreateOpen(false)}
      >
        <NoteForm
          members={members}
          onSubmit={(value) => {
            createNote(value);
            setIsCreateOpen(false);
          }}
          onCancel={() => setIsCreateOpen(false)}
        />
      </FormDialog>

      <FormDialog
        open={Boolean(editingNote)}
        mode="edit"
        noun="note"
        createDescription="Write it once in a place you can quickly come back to."
        editDescription="Keep the note readable and easy to search later."
        size="lg"
        onClose={() => setEditingNote(null)}
      >
        {editingNote ? (
          <NoteForm
            initialValue={editingNote}
            members={members}
            onSubmit={(value) => {
              updateNote(editingNote.id, value);
              setEditingNote(null);
            }}
            onCancel={() => setEditingNote(null)}
          />
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={isBulkDeleteOpen}
        title={`Delete ${selectedIds.size === 1 ? "note" : "notes"}`}
        description={`Are you sure you want to delete ${
          selectedIds.size === 1 ? "this note" : `${selectedIds.size} notes`
        }? They will be moved to the Recycle Bin.`}
        onCancel={() => {
          setIsBulkDeleteOpen(false);
          if (selectedIds.size === 1) setSelectedIds(new Set());
        }}
        onConfirm={() => {
          deleteNotes(Array.from(selectedIds));
          setSelectedIds(new Set());
          setIsBulkDeleteOpen(false);
        }}
      />
    </div>
  );
}
