import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEY, defaultWorkspaceData } from "@/lib/default-data";
import { useWorkHub } from "@/lib/work-hub-store";
import { renderWithProvider } from "@/test/test-utils";

function StoreHarness() {
  const { createTask, data, initialized } = useWorkHub();

  if (!initialized) {
    return <p>Loading</p>;
  }

  return (
    <div>
      <p>Task count: {data.tasks.length}</p>
      <button
        type="button"
        onClick={() =>
          createTask({
            title: "Stored task",
            description: "Persistence test",
            priority: "medium",
            status: "to do",
            dueDate: "2026-03-12",
            projectId: null,
            assigneeIds: [],
          })
        }
      >
        Add task
      </button>
    </div>
  );
}

describe("WorkHubProvider", () => {
  it("loads persisted state and saves new changes back to localStorage", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...defaultWorkspaceData,
        tasks: [],
      }),
    );

    const user = userEvent.setup();
    renderWithProvider(<StoreHarness />);

    await screen.findByText("Task count: 0");

    await user.click(screen.getByRole("button", { name: "Add task" }));

    await screen.findByText("Task count: 1");

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
      expect(saved.tasks).toHaveLength(1);
      expect(saved.tasks[0].title).toBe("Stored task");
    });
  });
});
