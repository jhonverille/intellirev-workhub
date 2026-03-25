import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TasksPage from "@/app/(workspace)/tasks/page";
import { STORAGE_KEY, defaultWorkspaceData } from "@/lib/default-data";
import { renderWithProvider } from "@/test/test-utils";

describe("TasksPage", () => {
  it("creates, edits, and deletes a task", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWorkspaceData));
    const user = userEvent.setup();

    renderWithProvider(<TasksPage />);

    await screen.findByText("Finish weekly planning");

    await user.click(screen.getByRole("button", { name: "New task" }));
    await user.type(
      screen.getByLabelText("Title"),
      "Prepare monthly review notes",
    );
    await user.type(
      screen.getByLabelText("Description"),
      "Pull highlights and open questions into one draft.",
    );
    await user.click(screen.getByRole("button", { name: "Create task" }));

    await screen.findByText("Prepare monthly review notes");

    await user.type(
      screen.getByPlaceholderText("Search title or description"),
      "monthly review",
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Prepare monthly review brief");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText("Prepare monthly review brief");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        screen.queryByText("Prepare monthly review brief"),
      ).not.toBeInTheDocument();
    });
  });

  it("filters and clears task results", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWorkspaceData));
    const user = userEvent.setup();

    renderWithProvider(<TasksPage />);

    await screen.findByText("Finish weekly planning");

    await user.selectOptions(screen.getByLabelText("Status"), "blocked");

    expect(screen.getByText("Book Q2 review block")).toBeInTheDocument();
    expect(screen.queryByText("Finish weekly planning")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByText("Finish weekly planning")).toBeInTheDocument();
    expect(screen.getByText("Book Q2 review block")).toBeInTheDocument();
  });
});
