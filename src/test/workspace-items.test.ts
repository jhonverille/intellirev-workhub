import { defaultWorkspaceData } from "@/lib/default-data";
import type { Task, WorkspaceData } from "@/lib/types";
import {
  combineCollections,
  diffItems,
  fromStoredItems,
  sameItem,
  toStoredItems,
  type StoredItem,
} from "@/lib/workspace-items";

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "",
    priority: "medium",
    status: "to do",
    dueDate: null,
    projectId: null,
    completed: false,
    assigneeIds: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function workspace(overrides: Partial<WorkspaceData> = {}): WorkspaceData {
  return {
    ...defaultWorkspaceData,
    tasks: [],
    projects: [],
    notes: [],
    links: [],
    trash: { tasks: [], projects: [], notes: [], links: [] },
    ...overrides,
  };
}

describe("toStoredItems", () => {
  it("tags each item with its kind and bin state", () => {
    const items = toStoredItems(
      workspace({
        tasks: [task("t1")],
        trash: { tasks: [task("t2")], projects: [], notes: [], links: [] },
      }),
    );

    expect(items.get("t1")).toMatchObject({ kind: "task", deleted: false, title: "Task t1" });
    expect(items.get("t2")).toMatchObject({ kind: "task", deleted: true });
  });

  it("leaves owner-only private items out — they belong to the per-user document", () => {
    const items = toStoredItems(
      workspace({ tasks: [task("t1"), task("secret", { visibility: "private" })] }),
    );

    expect([...items.keys()]).toEqual(["t1"]);
  });

  it("keeps a private item that has been shared, so its assignees can read it", () => {
    // "Private but shared": the item is private, but specific members have been
    // given it. Shared storage is the only place they can read it from, and the
    // page filters decide who actually sees it.
    const items = toStoredItems(
      workspace({
        tasks: [
          task("shared-privately", { visibility: "private", assigneeIds: ["user-2"] }),
          task("mine-alone", { visibility: "private", assigneeIds: [] }),
        ],
      }),
    );

    expect([...items.keys()]).toEqual(["shared-privately"]);
  });
});

describe("fromStoredItems", () => {
  it("splits stored documents back into active and trashed collections", () => {
    const stored: StoredItem[] = [
      { ...task("t1"), kind: "task", deleted: false },
      { ...task("t2"), kind: "task", deleted: true },
      { id: "p1", kind: "project", deleted: false, name: "Project" },
      { id: "n1", kind: "note", deleted: false, title: "Note" },
      { id: "l1", kind: "link", deleted: false, title: "Link" },
    ];

    const result = fromStoredItems(stored);

    expect(result.tasks.map((item) => item.id)).toEqual(["t1"]);
    expect(result.trash.tasks.map((item) => item.id)).toEqual(["t2"]);
    expect(result.projects.map((item) => item.id)).toEqual(["p1"]);
    expect(result.notes).toHaveLength(1);
    expect(result.links).toHaveLength(1);
  });

  it("drops the storage-only fields when rebuilding an item", () => {
    const [rebuilt] = fromStoredItems([{ ...task("t1"), kind: "task", deleted: false }]).tasks;

    expect(rebuilt).not.toHaveProperty("kind");
    expect(rebuilt).not.toHaveProperty("deleted");
    expect(rebuilt.title).toBe("Task t1");
  });

  it("round-trips a workspace unchanged", () => {
    const original = workspace({
      tasks: [task("t1"), task("t2")],
      trash: { tasks: [task("t3")], projects: [], notes: [], links: [] },
    });

    const round = fromStoredItems(toStoredItems(original).values());

    expect(round.tasks).toEqual(original.tasks);
    expect(round.trash.tasks).toEqual(original.trash.tasks);
  });

  it("ignores documents with an unknown kind rather than throwing", () => {
    const result = fromStoredItems([
      { id: "x", kind: "widget" as never, deleted: false },
      { ...task("t1"), kind: "task", deleted: false },
    ]);

    expect(result.tasks.map((item) => item.id)).toEqual(["t1"]);
  });
});

describe("diffItems", () => {
  const stored = (id: string, extra: Partial<StoredItem> = {}): StoredItem => ({
    ...task(id),
    kind: "task",
    deleted: false,
    ...extra,
  });

  it("writes only what changed and leaves other members' items alone", () => {
    // The whole point of the move: a local edit must not touch documents this
    // client did not change, so a concurrent member's item survives.
    const mine = stored("mine", { title: "Edited" });
    const theirs = stored("theirs");

    const { writes, deletes } = diffItems(
      new Map([
        ["mine", mine],
        ["theirs", theirs],
      ]),
      new Map([
        ["mine", stored("mine", { title: "Original" })],
        ["theirs", theirs],
      ]),
    );

    expect(writes.map((item) => item.id)).toEqual(["mine"]);
    expect(deletes).toEqual([]);
  });

  it("writes items that do not exist remotely yet", () => {
    const { writes } = diffItems(new Map([["new", stored("new")]]), new Map());
    expect(writes.map((item) => item.id)).toEqual(["new"]);
  });

  it("treats trashing as a write, not a delete", () => {
    const { writes, deletes } = diffItems(
      new Map([["t1", stored("t1", { deleted: true })]]),
      new Map([["t1", stored("t1")]]),
    );

    expect(writes[0]).toMatchObject({ id: "t1", deleted: true });
    expect(deletes).toEqual([]);
  });

  it("deletes documents for items that are gone entirely", () => {
    const { writes, deletes } = diffItems(
      new Map(),
      new Map([["t1", stored("t1", { deleted: true })]]),
    );

    expect(writes).toEqual([]);
    expect(deletes).toEqual(["t1"]);
  });

  it("writes nothing when local and remote agree", () => {
    const same = new Map([["t1", stored("t1")]]);
    const { writes, deletes } = diffItems(same, new Map([["t1", stored("t1")]]));

    expect(writes).toEqual([]);
    expect(deletes).toEqual([]);
  });
});

describe("sameItem", () => {
  it("ignores key order but sees nested changes", () => {
    expect(
      sameItem(
        { id: "a", kind: "task", deleted: false, assigneeIds: ["x"], title: "T" },
        { title: "T", assigneeIds: ["x"], deleted: false, kind: "task", id: "a" },
      ),
    ).toBe(true);

    expect(
      sameItem(
        { id: "a", kind: "task", deleted: false, assigneeIds: ["x"] },
        { id: "a", kind: "task", deleted: false, assigneeIds: ["y"] },
      ),
    ).toBe(false);
  });

  it("treats a missing field and an explicit undefined as the same", () => {
    // Firestore drops undefined on write, so the echo comes back without the key.
    expect(
      sameItem(
        { id: "a", kind: "task", deleted: false, visibility: undefined },
        { id: "a", kind: "task", deleted: false },
      ),
    ).toBe(true);
  });
});

describe("combineCollections", () => {
  const collections = (
    tasks: Task[] = [],
    trashTasks: Task[] = [],
  ) => ({
    tasks,
    projects: [],
    notes: [],
    links: [],
    trash: { tasks: trashTasks, projects: [], notes: [], links: [] },
  });

  it("unions shared storage with the member's private items", () => {
    const result = combineCollections(
      collections([task("shared")]),
      collections([task("mine", { visibility: "private" })]),
      collections(),
    );

    expect(result.tasks.map((item) => item.id).sort()).toEqual(["mine", "shared"]);
  });

  it("lets remote win for items this client is not writing", () => {
    // Another member renamed the task; our stale copy must not win.
    const result = combineCollections(
      collections([task("t1", { title: "Their edit" })]),
      collections(),
      collections([task("t1", { title: "Our stale copy" })]),
    );

    expect(result.tasks[0].title).toBe("Their edit");
  });

  it("keeps a pending local edit until the echo arrives", () => {
    const result = combineCollections(
      collections([task("t1", { title: "Old" })]),
      collections(),
      collections([task("t1", { title: "Just typed" })]),
      { localPriorityIds: new Set(["t1"]) },
    );

    expect(result.tasks[0].title).toBe("Just typed");
  });

  it("keeps a pending restore out of the bin", () => {
    // Storage still holds deleted: true while our restore is in flight.
    const result = combineCollections(
      collections([], [task("t1")]),
      collections(),
      collections([task("t1")]),
      { localPriorityIds: new Set(["t1"]) },
    );

    expect(result.tasks.map((item) => item.id)).toEqual(["t1"]);
    expect(result.trash.tasks).toEqual([]);
  });

  it("keeps a pending trash out of the active list", () => {
    const result = combineCollections(
      collections([task("t1")]),
      collections(),
      collections([], [task("t1")]),
      { localPriorityIds: new Set(["t1"]) },
    );

    expect(result.tasks).toEqual([]);
    expect(result.trash.tasks.map((item) => item.id)).toEqual(["t1"]);
  });

  it("keeps a pending permanent deletion deleted", () => {
    const result = combineCollections(
      collections([], [task("t1")]),
      collections(),
      collections(),
      { localPriorityIds: new Set(["t1"]) },
    );

    expect(result.tasks).toEqual([]);
    expect(result.trash.tasks).toEqual([]);
  });

  it("does not resurrect an item another member permanently deleted", () => {
    // No pending write for it, so storage is authoritative: it stays gone.
    const result = combineCollections(
      collections(),
      collections(),
      collections([task("gone")]),
    );

    expect(result.tasks).toEqual([]);
  });

  it("retains unknown local items only in legacy whole-document mode", () => {
    const result = combineCollections(
      collections(),
      collections(),
      collections([task("local-only")]),
      { retainUnknownLocals: true },
    );

    expect(result.tasks.map((item) => item.id)).toEqual(["local-only"]);
  });

  it("never lists an item as both live and binned", () => {
    const result = combineCollections(
      collections([task("t1")]),
      collections(),
      collections([], [task("t1")]),
      { retainUnknownLocals: true },
    );

    expect(result.tasks).toEqual([]);
    expect(result.trash.tasks.map((item) => item.id)).toEqual(["t1"]);
  });
});
