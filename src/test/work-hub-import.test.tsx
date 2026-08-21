import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEY, defaultWorkspaceData } from "@/lib/default-data";
import { useWorkHub } from "@/lib/work-hub-store";
import { renderWithProvider, signInWithWorkspace, testUser } from "@/test/test-utils";

/** A hand-edited export: valid enough to pass the file check, missing `trash`. */
const partialExport = {
  tasks: [
    {
      id: "imported-1",
      title: "Imported task",
      description: "",
      priority: "medium",
      status: "to do",
      dueDate: null,
      projectId: null,
      completed: false,
      assigneeIds: [],
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
  ],
  projects: [],
  notes: [],
  links: [],
  settings: defaultWorkspaceData.settings,
  // A different workspace's identity, as a real export file would carry.
  id: "other-workspace",
  ownerId: "someone-else",
  members: { "someone-else": { uid: "someone-else", email: "x@y.z", role: "owner" } },
};

function ImportHarness() {
  const { data, initialized, replaceData } = useWorkHub();

  if (!initialized) return <p>Loading</p>;

  return (
    <div>
      <button type="button" onClick={() => replaceData(partialExport as never)}>
        Import
      </button>
      <p data-testid="tasks">{data.tasks.map((task) => task.title).join(",")}</p>
      <p data-testid="trash-count">{String(data.trash.tasks.length)}</p>
      <p data-testid="owner">{String(data.ownerId)}</p>
      <p data-testid="members">{Object.keys(data.members ?? {}).join(",")}</p>
    </div>
  );
}

describe("importing a workspace export", () => {
  beforeEach(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...defaultWorkspaceData, tasks: [] }),
    );
    signInWithWorkspace({ tasks: [] });
  });

  it("fills in collections the file omits instead of crashing readers of them", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportHarness />);

    await screen.findByRole("button", { name: "Import" });
    await user.click(screen.getByRole("button", { name: "Import" }));

    // `data.trash.tasks` is read directly by the Trash page — an import missing
    // `trash` used to leave it undefined and throw on render.
    await waitFor(() => {
      expect(screen.getByTestId("tasks")).toHaveTextContent("Imported task");
    });
    expect(screen.getByTestId("trash-count")).toHaveTextContent("0");
  });

  it("keeps the live workspace owner and members rather than the file's", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportHarness />);

    await screen.findByRole("button", { name: "Import" });
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => {
      expect(screen.getByTestId("tasks")).toHaveTextContent("Imported task");
    });
    expect(screen.getByTestId("owner")).toHaveTextContent(testUser.uid);
    expect(screen.getByTestId("members")).toHaveTextContent(testUser.uid);
  });
});
