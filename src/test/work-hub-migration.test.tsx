import { screen, waitFor } from "@testing-library/react";
import { STORAGE_KEY, defaultWorkspaceData } from "@/lib/default-data";
import type { Task, WorkspaceData } from "@/lib/types";
import { ITEMS_SCHEMA_VERSION } from "@/lib/workspace-items";
import { useWorkHub } from "@/lib/work-hub-store";
import { getWriteCount, readDoc, seedDoc } from "@/test/fakes/firebase-fake";
import {
  itemDocPath,
  readItem,
  readStoredItems,
  renderWithProvider,
  signInWithLegacyWorkspace,
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

const legacyContent = {
  tasks: [makeTask({ id: "t1", title: "Legacy task" })],
  projects: [
    {
      id: "p1",
      name: "Legacy project",
      description: "",
      status: "active" as const,
      deadline: null,
      assigneeIds: [],
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
  ],
  notes: [],
  links: [],
  trash: {
    tasks: [makeTask({ id: "t2", title: "Legacy binned task" })],
    projects: [],
    notes: [],
    links: [],
  },
};

function Harness() {
  const { data, initialized } = useWorkHub();

  if (!initialized) return <p>Loading</p>;

  return (
    <div>
      <p data-testid="tasks">{data.tasks.map((task) => task.title).sort().join(",")}</p>
      <p data-testid="projects">{data.projects.map((project) => project.name).join(",")}</p>
      <p data-testid="binned">{data.trash.tasks.map((task) => task.title).join(",")}</p>
    </div>
  );
}

function seedLocalCache() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...defaultWorkspaceData, id: TEST_WORKSPACE_ID, ...legacyContent }),
  );
}

describe("migrating a legacy workspace", () => {
  it("reads content from the document arrays before migration completes", async () => {
    seedLocalCache();
    signInWithLegacyWorkspace(legacyContent);

    renderWithProvider(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("tasks")).toHaveTextContent("Legacy task");
    });
    expect(screen.getByTestId("projects")).toHaveTextContent("Legacy project");
    expect(screen.getByTestId("binned")).toHaveTextContent("Legacy binned task");
  });

  it("copies the arrays into item documents and marks the workspace migrated", async () => {
    seedLocalCache();
    signInWithLegacyWorkspace(legacyContent);

    renderWithProvider(<Harness />);

    await waitFor(() => {
      const workspace = readDoc(workspaceDocPath()) as WorkspaceData;
      expect(workspace.schemaVersion).toBe(ITEMS_SCHEMA_VERSION);
    });

    const stored = readStoredItems();
    expect([...stored.keys()].sort()).toEqual(["p1", "t1", "t2"]);
    expect(readItem("t1")).toMatchObject({ kind: "task", deleted: false, title: "Legacy task" });
    expect(readItem("p1")).toMatchObject({ kind: "project", deleted: false, name: "Legacy project" });
    // The recycle bin survives as a flag rather than a parallel array.
    expect(readItem("t2")).toMatchObject({ kind: "task", deleted: true });
  });

  it("keeps showing the same content once migrated", async () => {
    seedLocalCache();
    signInWithLegacyWorkspace(legacyContent);

    renderWithProvider(<Harness />);

    await waitFor(() => {
      expect((readDoc(workspaceDocPath()) as WorkspaceData).schemaVersion).toBe(
        ITEMS_SCHEMA_VERSION,
      );
    });

    // Post-migration reads come from the subcollection; the view must not change.
    await waitFor(() => {
      expect(screen.getByTestId("tasks")).toHaveTextContent("Legacy task");
    });
    expect(screen.getByTestId("projects")).toHaveTextContent("Legacy project");
    expect(screen.getByTestId("binned")).toHaveTextContent("Legacy binned task");
  });

  it("leaves migration to the owner", async () => {
    // A member must not race the owner writing the same item documents.
    const member = {
      uid: "user-2",
      email: "sam@example.com",
      displayName: "Sam",
      photoURL: null,
    };

    seedDoc(`users/${member.uid}`, {
      uid: member.uid,
      email: member.email,
      currentWorkspaceId: TEST_WORKSPACE_ID,
      workspaceIds: [TEST_WORKSPACE_ID],
    });
    seedDoc(workspaceDocPath(), {
      ...defaultWorkspaceData,
      ...legacyContent,
      id: TEST_WORKSPACE_ID,
      name: "Test Workspace",
      ownerId: testUser.uid,
      members: {
        [testUser.uid]: { uid: testUser.uid, email: testUser.email, role: "owner", joinedAt: "" },
        [member.uid]: { uid: member.uid, email: member.email, role: "member", joinedAt: "" },
      },
    });

    const { setFakeUser } = await import("@/test/fakes/firebase-fake");
    setFakeUser(member);

    renderWithProvider(<Harness />);

    // The member still sees everything, read from the legacy arrays.
    await waitFor(() => {
      expect(screen.getByTestId("tasks")).toHaveTextContent("Legacy task");
    });

    expect(readStoredItems().size).toBe(0);
    expect((readDoc(workspaceDocPath()) as WorkspaceData).schemaVersion).toBeUndefined();
    expect(getWriteCount(itemDocPath("t1"))).toBe(0);
  });
});
