import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEY, defaultWorkspaceData } from "@/lib/default-data";
import type { Task, WorkspaceData } from "@/lib/types";
import { useWorkHub } from "@/lib/work-hub-store";
import {
  emitInitialSnapshot,
  getWriteCount,
  holdSnapshots,
  simulateRemoteWrite,
  readDoc,
  seedDoc,
} from "@/test/fakes/firebase-fake";
import {
  itemDocPath,
  privateWorkspaceDocPath,
  readItem,
  readStoredItems,
  renderWithProvider,
  signInWithWorkspace,
  testUser,
  TEST_WORKSPACE_ID,
  workspaceDocPath,
} from "@/test/test-utils";

function makeTask(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    description: "",
    priority: "medium",
    status: "to do",
    dueDate: null,
    projectId: null,
    completed: false,
    assigneeIds: [],
    ownerId: testUser.uid,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

/** Renders synced content as text, and exposes the mutations under test. */
function SyncHarness() {
  const { data, initialized, createTask, toggleTaskCompletion } = useWorkHub();

  if (!initialized) {
    return <p>Loading</p>;
  }

  const addTask = (title: string, visibility?: "public" | "private") =>
    createTask({
      title,
      description: "",
      priority: "medium",
      status: "to do",
      dueDate: null,
      projectId: null,
      assigneeIds: [],
      ...(visibility ? { visibility } : {}),
    });

  return (
    <div>
      <button type="button" onClick={() => addTask("Fresh public task", "public")}>
        Add public task
      </button>
      <button type="button" onClick={() => addTask("Fresh private task", "private")}>
        Add private task
      </button>
      <button type="button" onClick={() => addTask("Bare task")}>
        Add bare task
      </button>
      <button type="button" onClick={() => toggleTaskCompletion("mine")}>
        Toggle mine
      </button>
      <p data-testid="task-titles">
        {data.tasks
          .map((task) => task.title)
          .sort()
          .join(",")}
      </p>
      <p data-testid="request-ids">
        {(data.assignmentRequests ?? [])
          .map((request) => request.id)
          .sort()
          .join(",")}
      </p>
    </div>
  );
}

/**
 * A cached workspace as the browser would hold it. `id` matters: the store only
 * treats a cache as pending local work when it belongs to this workspace.
 */
function seedLocalCache(overrides: Partial<WorkspaceData> = {}) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...defaultWorkspaceData,
      id: TEST_WORKSPACE_ID,
      tasks: [],
      projects: [],
      notes: [],
      links: [],
      ...overrides,
    }),
  );
}

/** Storage seeds default to the demo content; these tests want a clean slate. */
const emptyContent = {
  tasks: [],
  projects: [],
  notes: [],
  links: [],
  trash: { tasks: [], projects: [], notes: [], links: [] },
};

function storedTasks() {
  return [...readStoredItems().values()].filter((item) => item.kind === "task");
}

describe("workspace sync", () => {
  it("waits for the workspace document before merging, so a private-first snapshot cannot drop assignment requests", async () => {
    seedLocalCache();

    const pendingRequest = {
      id: "request-1",
      itemId: "task-public",
      itemType: "task" as const,
      itemName: "Public task",
      fromId: "user-2",
      fromName: "Sam",
      toId: testUser.uid,
      status: "pending" as const,
      timestamp: new Date(0).toISOString(),
    };

    signInWithWorkspace({
      tasks: [makeTask({ id: "task-public", title: "Public task" })],
      assignmentRequests: [pendingRequest],
    });
    seedDoc(privateWorkspaceDocPath(), {
      ...defaultWorkspaceData,
      tasks: [
        makeTask({ id: "task-private", title: "Private task", visibility: "private" }),
      ],
      assignmentRequests: [],
    });

    // Hold the workspace document so the private one lands first — the ordering
    // that used to merge against empty defaults and lose pending requests.
    holdSnapshots([workspaceDocPath(), privateWorkspaceDocPath()]);
    renderWithProvider(<SyncHarness />);

    await screen.findByTestId("task-titles");
    emitInitialSnapshot(privateWorkspaceDocPath());

    await waitFor(() => {
      expect(screen.getByTestId("task-titles")).toHaveTextContent("");
    });
    expect(screen.getByTestId("request-ids")).toHaveTextContent("");

    emitInitialSnapshot(workspaceDocPath());

    await waitFor(() => {
      expect(screen.getByTestId("task-titles")).toHaveTextContent(
        "Private task,Public task",
      );
    });
    expect(screen.getByTestId("request-ids")).toHaveTextContent("request-1");
  });

  it("merges the member's private items with the shared items", async () => {
    seedLocalCache();
    signInWithWorkspace({ tasks: [makeTask({ id: "task-public", title: "Public task" })] });
    seedDoc(privateWorkspaceDocPath(), {
      ...defaultWorkspaceData,
      tasks: [
        makeTask({ id: "task-private", title: "Private task", visibility: "private" }),
      ],
    });

    renderWithProvider(<SyncHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("task-titles")).toHaveTextContent(
        "Private task,Public task",
      );
    });
  });

  it("keeps a deletion made offline from reappearing, and writes it out", async () => {
    const trashedTask = makeTask({ id: "task-deleted", title: "Deleted task" });
    seedLocalCache({ trash: { ...defaultWorkspaceData.trash, tasks: [trashedTask] } });

    // Storage still lists it as live: the deletion never reached the server.
    signInWithWorkspace({
      tasks: [trashedTask, makeTask({ id: "task-live", title: "Live task" })],
    });

    renderWithProvider(<SyncHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("task-titles")).toHaveTextContent("Live task");
    });
    expect(screen.getByTestId("task-titles")).not.toHaveTextContent("Deleted task");

    await waitFor(() => {
      expect(readItem("task-deleted")?.deleted).toBe(true);
    });
  });

  it("routes private items to the per-user document and shared items to item documents", async () => {
    seedLocalCache();
    signInWithWorkspace(emptyContent);

    const user = userEvent.setup();
    renderWithProvider(<SyncHarness />);

    await screen.findByRole("button", { name: "Add private task" });
    await user.click(screen.getByRole("button", { name: "Add public task" }));
    await user.click(screen.getByRole("button", { name: "Add private task" }));

    await waitFor(() => {
      expect(screen.getByTestId("task-titles")).toHaveTextContent(
        "Fresh private task,Fresh public task",
      );
    });

    await waitFor(() => {
      expect(storedTasks().map((item) => item.title)).toEqual(["Fresh public task"]);
    });

    const privateDoc = readDoc(privateWorkspaceDocPath()) as WorkspaceData;
    expect(privateDoc.tasks.map((task) => task.title)).toEqual(["Fresh private task"]);
  });

  it("stores a task with no explicit visibility", async () => {
    // Firestore rejects undefined field values, and rejects the whole write with
    // them — an unset optional `visibility` used to break every sync.
    seedLocalCache();
    signInWithWorkspace(emptyContent);

    const user = userEvent.setup();
    renderWithProvider(<SyncHarness />);

    await screen.findByRole("button", { name: "Add bare task" });
    await user.click(screen.getByRole("button", { name: "Add bare task" }));

    await waitFor(() => {
      expect(storedTasks().map((item) => item.title)).toEqual(["Bare task"]);
    });
  });

  it("never writes the workspace document on a content change", async () => {
    // Membership, settings and the storage flag live there. Content changes must
    // not go near it — that document is what members used to clobber.
    seedLocalCache();
    signInWithWorkspace(emptyContent);

    const user = userEvent.setup();
    renderWithProvider(<SyncHarness />);

    await screen.findByRole("button", { name: "Add public task" });
    await user.click(screen.getByRole("button", { name: "Add public task" }));

    await waitFor(() => {
      expect(storedTasks()).toHaveLength(1);
    });
    expect(getWriteCount(workspaceDocPath())).toBe(0);
  });

  it("writes only the item that changed and leaves a concurrent member's item untouched", async () => {
    // The reason for item documents: two members editing different items no
    // longer write the same document, so neither can drop the other's work.
    seedLocalCache();
    signInWithWorkspace({
      tasks: [
        makeTask({ id: "mine", title: "My task" }),
        makeTask({ id: "theirs", title: "Their task", ownerId: "user-2" }),
      ],
    });

    const user = userEvent.setup();
    renderWithProvider(<SyncHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("task-titles")).toHaveTextContent("My task,Their task");
    });

    await user.click(screen.getByRole("button", { name: "Toggle mine" }));

    await waitFor(() => {
      expect(readItem("mine")?.completed).toBe(true);
    });

    expect(getWriteCount(itemDocPath("theirs"))).toBe(0);
    expect(readItem("theirs")).toMatchObject({ title: "Their task", ownerId: "user-2" });
    expect(screen.getByTestId("task-titles")).toHaveTextContent("My task,Their task");
  });

  it("picks up an item another member adds, with no local write", async () => {
    seedLocalCache();
    signInWithWorkspace({ tasks: [makeTask({ id: "mine", title: "My task" })] });

    renderWithProvider(<SyncHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("task-titles")).toHaveTextContent("My task");
    });

    // Another member's client creates its own item document.
    simulateRemoteWrite(itemDocPath("theirs"), {
      ...makeTask({ id: "theirs", title: "Their new task", ownerId: "user-2" }),
      kind: "task",
      deleted: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-titles")).toHaveTextContent("My task,Their new task");
    });
    // Receiving it must not make this client rewrite anything.
    expect(getWriteCount(itemDocPath("theirs"))).toBe(0);
  });
});
