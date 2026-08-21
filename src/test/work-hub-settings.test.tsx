import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEY, defaultWorkspaceData } from "@/lib/default-data";
import type { WorkspaceData } from "@/lib/types";
import { useWorkHub } from "@/lib/work-hub-store";
import { getWriteCount, readDoc, seedDoc } from "@/test/fakes/firebase-fake";
import {
  privateWorkspaceDocPath,
  renderWithProvider,
  signInWithWorkspace,
  workspaceDocPath,
} from "@/test/test-utils";

function SettingsHarness() {
  const { data, initialized, setTheme } = useWorkHub();

  if (!initialized) return <p>Loading</p>;

  return (
    <div>
      <button type="button" onClick={() => setTheme("dark")}>
        Go dark
      </button>
      <p data-testid="theme">{data.settings.theme}</p>
      <p data-testid="profile">{data.settings.profileName}</p>
    </div>
  );
}

function seedLocalCache(settings: WorkspaceData["settings"]) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...defaultWorkspaceData, tasks: [], projects: [], notes: [], links: [], settings }),
  );
}

describe("personal settings", () => {
  it("writes a theme change to the per-user doc and leaves the shared doc alone", async () => {
    const sharedSettings = { ...defaultWorkspaceData.settings, theme: "light" as const };
    seedLocalCache(sharedSettings);
    signInWithWorkspace({ tasks: [], settings: sharedSettings });

    const user = userEvent.setup();
    renderWithProvider(<SettingsHarness />);

    await screen.findByRole("button", { name: "Go dark" });
    await user.click(screen.getByRole("button", { name: "Go dark" }));

    await waitFor(() => {
      const privateDoc = readDoc(privateWorkspaceDocPath()) as WorkspaceData;
      expect(privateDoc?.settings.theme).toBe("dark");
    });

    // The shared doc still holds what it started with: one member's theme must
    // not become the whole workspace's theme.
    const publicDoc = readDoc(workspaceDocPath()) as WorkspaceData;
    expect(publicDoc.settings.theme).toBe("light");
  });

  it("settles after a settings change instead of echoing between the two listeners", async () => {
    // The public doc echoes before the private write lands. Re-adopting settings
    // from every snapshot made the two listeners flip the value back and forth,
    // writing on each flip until the process ran out of memory.
    const sharedSettings = { ...defaultWorkspaceData.settings, theme: "light" as const };
    seedLocalCache(sharedSettings);
    signInWithWorkspace({ tasks: [], settings: sharedSettings });

    const user = userEvent.setup();
    renderWithProvider(<SettingsHarness />);

    await screen.findByRole("button", { name: "Go dark" });
    await user.click(screen.getByRole("button", { name: "Go dark" }));

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });

    // One change is one write per document. The bound is what discriminates:
    // when the listeners fight, the count runs into the hundreds.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getWriteCount(workspaceDocPath())).toBeLessThanOrEqual(4);
    expect(getWriteCount(privateWorkspaceDocPath())).toBeLessThanOrEqual(4);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("prefers the member's own stored settings over the workspace's", async () => {
    seedLocalCache({ ...defaultWorkspaceData.settings, theme: "system" });
    signInWithWorkspace({
      tasks: [],
      settings: { ...defaultWorkspaceData.settings, theme: "light", profileName: "Workspace default" },
    });
    seedDoc(privateWorkspaceDocPath(), {
      ...defaultWorkspaceData,
      tasks: [],
      settings: { ...defaultWorkspaceData.settings, theme: "dark", profileName: "My name" },
    });

    renderWithProvider(<SettingsHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });
    expect(screen.getByTestId("profile")).toHaveTextContent("My name");
  });
});
