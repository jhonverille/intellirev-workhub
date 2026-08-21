import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEY, defaultWorkspaceData } from "@/lib/default-data";
import type { AssignmentRequest, Task, WorkspaceData } from "@/lib/types";
import { useWorkHub } from "@/lib/work-hub-store";
import {
  getWriteCount,
  listDocs,
  readDoc,
  seedDoc,
  simulateRemoteWrite,
} from "@/test/fakes/firebase-fake";
import {
  readItem,
  requestDocPath,
  requestsCollectionPath,
  renderWithProvider,
  signInWithLegacyWorkspace,
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

function makeRequest(overrides: Partial<AssignmentRequest> & Pick<AssignmentRequest, "id">): AssignmentRequest {
  return {
    itemId: "shared-task",
    itemType: "task",
    itemName: "Shared task",
    fromId: "user-2",
    fromName: "Sam",
    toId: testUser.uid,
    status: "pending",
    timestamp: new Date(0).toISOString(),
    ...overrides,
  };
}

function Harness() {
  const { data, initialized, requestAssignment, respondToAssignment } = useWorkHub();

  if (!initialized) return <p>Loading</p>;

  return (
    <div>
      <button
        type="button"
        onClick={() => requestAssignment("shared-task", "task", "Shared task", "user-3")}
      >
        Send request
      </button>
      <button type="button" onClick={() => respondToAssignment("req-mine", "accepted")}>
        Accept mine
      </button>
      <p data-testid="request-ids">
        {(data.assignmentRequests ?? []).map((request) => request.id).sort().join(",")}
      </p>
      <p data-testid="assignees">
        {data.tasks.find((task) => task.id === "shared-task")?.assigneeIds.join(",") ?? ""}
      </p>
    </div>
  );
}

function seedLocalCache() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...defaultWorkspaceData,
      id: TEST_WORKSPACE_ID,
      tasks: [],
      projects: [],
      notes: [],
      links: [],
    }),
  );
}

const content = {
  tasks: [makeTask({ id: "shared-task", title: "Shared task" })],
  projects: [],
  notes: [],
  links: [],
  trash: { tasks: [], projects: [], notes: [], links: [] },
};

describe("assignment requests", () => {
  it("sends a request as its own document, leaving the workspace document alone", async () => {
    seedLocalCache();
    signInWithWorkspace(content);

    const user = userEvent.setup();
    renderWithProvider(<Harness />);

    await screen.findByRole("button", { name: "Send request" });
    await user.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => {
      expect(listDocs(requestsCollectionPath()).size).toBe(1);
    });

    const [stored] = [...listDocs(requestsCollectionPath()).values()];
    expect(stored).toMatchObject({ itemId: "shared-task", toId: "user-3", status: "pending" });
    expect(getWriteCount(workspaceDocPath())).toBe(0);
  });

  it("answering one request leaves another member's request untouched", async () => {
    // The reason for the move: answering used to rewrite the whole array, so a
    // request that arrived in between could be wiped out by the response.
    seedLocalCache();
    signInWithWorkspace(content);
    seedDoc(requestDocPath("req-mine"), makeRequest({ id: "req-mine" }));
    seedDoc(
      requestDocPath("req-theirs"),
      makeRequest({ id: "req-theirs", toId: "user-3", itemName: "Their business" }),
    );

    const user = userEvent.setup();
    renderWithProvider(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("request-ids")).toHaveTextContent("req-mine,req-theirs");
    });

    await user.click(screen.getByRole("button", { name: "Accept mine" }));

    await waitFor(() => {
      expect(readDoc(requestDocPath("req-mine"))).toBeUndefined();
    });
    expect(readDoc(requestDocPath("req-theirs"))).toMatchObject({ id: "req-theirs" });
  });

  it("does not drop a request that arrived while this client's copy was stale", async () => {
    // The exact loss the array caused: a request lands after we loaded, so our
    // copy of the list is one behind, and answering wrote that stale list back.
    // `seedDoc` deliberately does not notify, which is what makes us stale.
    seedLocalCache();
    signInWithWorkspace(content);
    seedDoc(requestDocPath("req-mine"), makeRequest({ id: "req-mine" }));

    const user = userEvent.setup();
    renderWithProvider(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("request-ids")).toHaveTextContent("req-mine");
    });

    seedDoc(requestDocPath("req-late"), makeRequest({ id: "req-late", toId: "user-3" }));
    expect(screen.getByTestId("request-ids")).not.toHaveTextContent("req-late");

    await user.click(screen.getByRole("button", { name: "Accept mine" }));

    await waitFor(() => {
      expect(readDoc(requestDocPath("req-mine"))).toBeUndefined();
    });
    expect(readDoc(requestDocPath("req-late"))).toMatchObject({ id: "req-late" });
  });

  it("accepting records the assignee on the item document", async () => {
    seedLocalCache();
    signInWithWorkspace(content);
    seedDoc(requestDocPath("req-mine"), makeRequest({ id: "req-mine" }));

    const user = userEvent.setup();
    renderWithProvider(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("request-ids")).toHaveTextContent("req-mine");
    });

    await user.click(screen.getByRole("button", { name: "Accept mine" }));

    await waitFor(() => {
      expect(screen.getByTestId("assignees")).toHaveTextContent(testUser.uid);
    });
    await waitFor(() => {
      expect(readItem("shared-task")?.assigneeIds).toEqual([testUser.uid]);
    });
  });

  it("shows a request another member sends, without writing anything back", async () => {
    seedLocalCache();
    signInWithWorkspace(content);

    renderWithProvider(<Harness />);
    await screen.findByRole("button", { name: "Send request" });

    simulateRemoteWrite(requestDocPath("req-incoming"), makeRequest({ id: "req-incoming" }));

    await waitFor(() => {
      expect(screen.getByTestId("request-ids")).toHaveTextContent("req-incoming");
    });
    expect(getWriteCount(requestDocPath("req-incoming"))).toBe(0);
  });

  it("moves requests out of the workspace document when the workspace migrates", async () => {
    seedLocalCache();
    signInWithLegacyWorkspace({
      ...content,
      assignmentRequests: [makeRequest({ id: "legacy-request" })],
    });

    renderWithProvider(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("request-ids")).toHaveTextContent("legacy-request");
    });

    await waitFor(() => {
      expect(readDoc(requestDocPath("legacy-request"))).toMatchObject({
        id: "legacy-request",
      });
    });
    expect((readDoc(workspaceDocPath()) as WorkspaceData).schemaVersion).toBe(2);
  });

  it("still works on a workspace that has not migrated yet", async () => {
    // A member cannot migrate, so the array path has to keep working for them.
    const member = { uid: "user-2", email: "sam@example.com", displayName: "Sam", photoURL: null };
    seedDoc(`users/${member.uid}`, {
      uid: member.uid,
      email: member.email,
      currentWorkspaceId: TEST_WORKSPACE_ID,
      workspaceIds: [TEST_WORKSPACE_ID],
    });
    seedDoc(workspaceDocPath(), {
      ...defaultWorkspaceData,
      ...content,
      id: TEST_WORKSPACE_ID,
      ownerId: testUser.uid,
      members: {
        [testUser.uid]: { uid: testUser.uid, email: testUser.email, role: "owner", joinedAt: "" },
        [member.uid]: { uid: member.uid, email: member.email, role: "member", joinedAt: "" },
      },
      assignmentRequests: [makeRequest({ id: "legacy-request", toId: member.uid })],
    });

    const { setFakeUser } = await import("@/test/fakes/firebase-fake");
    setFakeUser(member);

    renderWithProvider(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("request-ids")).toHaveTextContent("legacy-request");
    });
    expect(listDocs(requestsCollectionPath()).size).toBe(0);
  });
});
