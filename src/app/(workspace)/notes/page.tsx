"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NoteForm } from "@/components/forms/note-form";
import { CollectionToolbar } from "@/components/workspace/collection-toolbar";
import { EntityActions } from "@/components/workspace/entity-actions";
import { FormDialog } from "@/components/workspace/form-dialog";
import {
  FilterIcon,
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

export default function NotesPage() {
  const { data, searchQuery, createNote, updateNote, deleteNote } = useWorkHub();
  const [localSearch, setLocalSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const query = safeLower(`${searchQuery} ${localSearch}`.trim());
  const notes = sortByUpdatedAt(data.notes).filter((note) => {
    const haystack = [note.title, note.content, note.tags.join(" ")].join(" ");
    return query ? haystack.toLocaleLowerCase().includes(query) : true;
  });

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
                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                      {note.title}
                    </h2>
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
                </div>

                <EntityActions
                  onEdit={() => setEditingNote(note)}
                  onDelete={() => setNoteToDelete(note)}
                />
              </div>
            </Surface>
          ))}
        </div>
      )}

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
            onSubmit={(value) => {
              updateNote(editingNote.id, value);
              setEditingNote(null);
            }}
            onCancel={() => setEditingNote(null)}
          />
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(noteToDelete)}
        title="Delete note"
        description={`Delete "${noteToDelete?.title ?? "this note"}"?`}
        onCancel={() => setNoteToDelete(null)}
        onConfirm={() => {
          if (noteToDelete) {
            deleteNote(noteToDelete.id);
          }
          setNoteToDelete(null);
        }}
      />
    </div>
  );
}
