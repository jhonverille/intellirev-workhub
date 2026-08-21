/**
 * Shared workspace content as individual documents.
 *
 * Everything used to live in one `workspaces/{id}` document that each client
 * rewrote wholesale. `setDoc(..., {merge: true})` does not merge *inside* an
 * array, so two members editing different tasks would clobber each other: the
 * second write replaced `tasks[]` with a copy that never contained the first
 * member's task. A single document is also capped at 1 MiB.
 *
 * Items now live in `workspaces/{id}/items/{itemId}`, one document each, so two
 * members touching different items never write the same document. This module
 * holds the pure translation between that storage shape and the in-memory
 * `WorkspaceData` the app renders, plus the diff that decides what to write.
 */
import type { Note, Project, QuickLink, Task, WorkspaceData } from "@/lib/types";

export type ItemKind = "task" | "project" | "note" | "link";

/** The stored form: the item, its kind, and whether it sits in the recycle bin. */
export type StoredItem = {
  id: string;
  kind: ItemKind;
  deleted: boolean;
  [field: string]: unknown;
};

export const ITEMS_COLLECTION = "items";

/**
 * Assignment requests, one document each. They were an array on the workspace
 * document, so accepting one rewrote the whole array and could drop a request
 * another member had just answered.
 */
export const REQUESTS_COLLECTION = "requests";

/** Workspaces carrying this version keep their content in the subcollection. */
export const ITEMS_SCHEMA_VERSION = 2;

type KindMap = {
  task: Task;
  project: Project;
  note: Note;
  link: QuickLink;
};

const KIND_TO_ACTIVE_FIELD: Record<ItemKind, keyof Pick<WorkspaceData, "tasks" | "projects" | "notes" | "links">> = {
  task: "tasks",
  project: "projects",
  note: "notes",
  link: "links",
};

function isPrivate(item: { visibility?: "public" | "private" }) {
  return item.visibility === "private";
}

function store(kind: ItemKind, item: { id: string }, deleted: boolean): StoredItem {
  return { ...item, kind, deleted };
}

/**
 * The shared items this client believes should exist, keyed by id. Private items
 * are excluded: they belong to the per-user document.
 */
export function toStoredItems(data: WorkspaceData): Map<string, StoredItem> {
  const result = new Map<string, StoredItem>();

  const add = (kind: ItemKind, items: Array<{ id: string; visibility?: "public" | "private" }>, deleted: boolean) => {
    for (const item of items) {
      if (isPrivate(item)) continue;
      result.set(item.id, store(kind, item, deleted));
    }
  };

  add("task", data.tasks, false);
  add("project", data.projects, false);
  add("note", data.notes, false);
  add("link", data.links, false);
  add("task", data.trash.tasks, true);
  add("project", data.trash.projects, true);
  add("note", data.trash.notes, true);
  add("link", data.trash.links, true);

  return result;
}

type Collections = Pick<WorkspaceData, "tasks" | "projects" | "notes" | "links" | "trash">;

function emptyCollections(): Collections {
  return {
    tasks: [],
    projects: [],
    notes: [],
    links: [],
    trash: { tasks: [], projects: [], notes: [], links: [] },
  };
}

/** Split stored documents back into the active and trashed collections. */
export function fromStoredItems(items: Iterable<StoredItem>): Collections {
  const result = emptyCollections();

  for (const stored of items) {
    const field = KIND_TO_ACTIVE_FIELD[stored.kind];
    if (!field) continue;

    // Strip the storage-only fields; the rest is the domain item as written.
    const item: Record<string, unknown> = { ...stored };
    delete item.kind;
    delete item.deleted;

    const target = stored.deleted ? result.trash[field] : result[field];
    (target as unknown[]).push(item);
  }

  return result;
}

/**
 * What to send so storage matches `desired`. Items absent from `desired` were
 * permanently deleted (emptying the bin), so their documents go too — trashing
 * only flips `deleted`.
 */
export function diffItems(
  desired: Map<string, StoredItem>,
  remote: Map<string, StoredItem>,
): { writes: StoredItem[]; deletes: string[] } {
  const writes: StoredItem[] = [];
  const deletes: string[] = [];

  for (const [id, item] of desired) {
    const current = remote.get(id);
    if (!current || !sameItem(current, item)) {
      writes.push(item);
    }
  }

  for (const id of remote.keys()) {
    if (!desired.has(id)) {
      deletes.push(id);
    }
  }

  return { writes, deletes };
}

/** Field-by-field comparison; key order in a Firestore document is not stable. */
export function sameItem(left: StoredItem, right: StoredItem): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if (stableValue(left[key]) !== stableValue(right[key])) {
      return false;
    }
  }

  return true;
}

function stableValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value as object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableValue((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Kept only so the compiler enforces that every kind maps to a domain type. */
export type ItemFor<K extends ItemKind> = KindMap[K];

const COLLECTION_FIELDS = ["tasks", "projects", "notes", "links"] as const;
type CollectionField = (typeof COLLECTION_FIELDS)[number];

export type ItemCollections = Collections;

type AnyItem = { id: string };

export type CombineOptions = {
  /**
   * Items this client has written but not yet seen echoed back. For these the
   * local copy wins, so an edit is not briefly reverted by an older snapshot,
   * and a restore is not undone by a `deleted: true` document still in flight.
   */
  localPriorityIds?: Set<string>;
  /**
   * Legacy whole-document mode: keep local items the snapshot has not caught up
   * with, and let the local recycle bin hide an item the snapshot still lists as
   * active. Item documents do not need this — the diff writes each item — and it
   * would resurrect anything another member permanently deleted.
   */
  retainUnknownLocals?: boolean;
};

/**
 * Fold shared storage, this member's private document, and pending local state
 * into the collections the app renders.
 */
export function combineCollections(
  shared: Collections,
  privateSide: Collections,
  local: Collections,
  options: CombineOptions = {},
): Collections {
  const localPriorityIds = options.localPriorityIds ?? new Set<string>();
  const result = emptyCollections();

  for (const field of COLLECTION_FIELDS) {
    const active = new Map<string, AnyItem>();
    const trashed = new Map<string, AnyItem>();

    const place = (map: Map<string, AnyItem>, items: readonly AnyItem[]) => {
      for (const item of items) map.set(item.id, item);
    };

    // Remote truth first: shared storage, then this member's private items.
    place(active, shared[field] as readonly AnyItem[]);
    place(trashed, shared.trash[field] as readonly AnyItem[]);
    place(active, privateSide[field] as readonly AnyItem[]);
    place(trashed, privateSide.trash[field] as readonly AnyItem[]);

    if (options.retainUnknownLocals) {
      for (const item of local[field] as readonly AnyItem[]) {
        if (!active.has(item.id) && !trashed.has(item.id)) active.set(item.id, item);
      }
      for (const item of local.trash[field] as readonly AnyItem[]) {
        trashed.set(item.id, item);
        active.delete(item.id);
      }
    }

    // Pending writes: whatever the local state says about these ids is newer.
    if (localPriorityIds.size > 0) {
      const localActive = new Map(
        (local[field] as readonly AnyItem[]).map((item) => [item.id, item]),
      );
      const localTrashed = new Map(
        (local.trash[field] as readonly AnyItem[]).map((item) => [item.id, item]),
      );

      for (const id of localPriorityIds) {
        const pendingActive = localActive.get(id);
        const pendingTrashed = localTrashed.get(id);
        if (!pendingActive && !pendingTrashed) {
          // Pending permanent deletion: stay gone even if storage still lists it.
          if (active.has(id) || trashed.has(id)) {
            active.delete(id);
            trashed.delete(id);
          }
          continue;
        }

        active.delete(id);
        trashed.delete(id);
        if (pendingTrashed) trashed.set(id, pendingTrashed);
        else if (pendingActive) active.set(id, pendingActive);
      }
    }

    // An item cannot be both live and in the bin.
    for (const id of trashed.keys()) active.delete(id);

    assign(result, field, [...active.values()]);
    assign(result.trash, field, [...trashed.values()]);
  }

  return result;
}

function assign(
  target: Record<CollectionField, unknown>,
  field: CollectionField,
  items: AnyItem[],
) {
  target[field] = items;
}

/**
 * Same rule as `combineCollections`, for a flat list of documents: storage is
 * authoritative except for ids with a write in flight, where the local view wins
 * (so a just-answered request does not flicker back into the list).
 */
export function combineById<T extends { id: string }>(
  remote: readonly T[],
  local: readonly T[],
  pendingIds: Set<string>,
): T[] {
  const byId = new Map(remote.map((entry) => [entry.id, entry]));
  const localById = new Map(local.map((entry) => [entry.id, entry]));

  for (const id of pendingIds) {
    const mine = localById.get(id);
    if (mine) byId.set(id, mine);
    else byId.delete(id);
  }

  return [...byId.values()];
}
