import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { TopNav } from "@/components/top-nav";
import { STORAGE_KEY, defaultWorkspaceData } from "@/lib/default-data";
import { renderWithProvider } from "@/test/test-utils";

const pushSpy = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: pushSpy }),
}));

describe("TopNav", () => {
  it("toggles theme and persists the preference", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...defaultWorkspaceData,
        settings: { ...defaultWorkspaceData.settings, theme: "light" },
      }),
    );
    const user = userEvent.setup();

    renderWithProvider(<TopNav onOpenSidebar={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Toggle dark mode" }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(saved.settings.theme).toBe("dark");
  });

  it("searches descriptions and supports keyboard selection", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWorkspaceData));
    const user = userEvent.setup();

    renderWithProvider(<TopNav onOpenSidebar={() => undefined} />);

    const input = screen.getByPlaceholderText(
      "Search tasks, notes, projects, and links",
    );
    await user.type(input, "playbooks");

    await screen.findByText("Knowledge Base Refresh");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(pushSpy).toHaveBeenCalledWith("/projects");
  });
});
