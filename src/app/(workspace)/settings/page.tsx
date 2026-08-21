"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/forms/field";
import { DownloadIcon, UploadIcon, UserIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";
import { Toggle } from "@/components/ui/toggle";
import type { WorkspaceData, WorkspaceSettings } from "@/lib/types";
import { useWorkHub } from "@/lib/work-hub-store";

export default function SettingsPage() {
  const { data, updateSettings, replaceData } = useWorkHub();
  const settingsKey = JSON.stringify(data.settings);

  return (
    <SettingsEditor
      key={settingsKey}
      data={data}
      initialSettings={data.settings}
      onSave={updateSettings}
      onImport={replaceData}
    />
  );
}

function SettingsEditor({
  data,
  initialSettings,
  onSave,
  onImport,
}: {
  data: WorkspaceData;
  initialSettings: WorkspaceSettings;
  onSave: (value: WorkspaceSettings) => void;
  onImport: (value: WorkspaceData) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<WorkspaceSettings>(initialSettings);
  const [saved, setSaved] = useState(false);
  const [pendingImport, setPendingImport] = useState<WorkspaceData | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialSettings);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Preferences"
        title="Settings"
        description="Adjust theme, profile details, and a few lightweight preferences that shape your workspace."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface className="p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-[var(--surface-strong)] text-[var(--accent)]">
              <UserIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                Profile
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Keep the workspace feeling personal and recognizable.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <Field label="Name">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  data-autofocus
                  value={form.profileName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      profileName: event.target.value,
                    }))
                  }
                />
              )}
            </Field>

            <Field label="Role">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={form.profileRole}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      profileRole: event.target.value,
                    }))
                  }
                />
              )}
            </Field>
          </div>
        </Surface>

        <Surface className="p-6">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Experience
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Small adjustments that can make daily use feel more natural.
          </p>

          <div className="mt-6 space-y-5">
            <Field label="Theme preference">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={form.theme}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      theme: event.target.value as WorkspaceSettings["theme"],
                    }))
                  }
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </Select>
              )}
            </Field>

            <Toggle
              checked={form.preferences.compactMode}
              onChange={(next) =>
                setForm((current) => ({
                  ...current,
                  preferences: {
                    ...current.preferences,
                    compactMode: next,
                  },
                }))
              }
              label="Compact list spacing"
              description="Tighten vertical spacing across list-heavy screens."
            />
            <Toggle
              checked={form.preferences.showCompletedTasks}
              onChange={(next) =>
                setForm((current) => ({
                  ...current,
                  preferences: {
                    ...current.preferences,
                    showCompletedTasks: next,
                  },
                }))
              }
              label="Show completed tasks"
              description="Keep finished work visible in the main tasks list."
            />
            <Toggle
              checked={form.preferences.startWeekOnMonday}
              onChange={(next) =>
                setForm((current) => ({
                  ...current,
                  preferences: {
                    ...current.preferences,
                    startWeekOnMonday: next,
                  },
                }))
              }
              label="Start the week on Monday"
              description="Save your preferred planning convention for future extensions."
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">
              {saved
                ? "Preferences saved locally."
                : hasChanges
                  ? "Unsaved changes are ready to save."
                  : "Everything is up to date."}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setForm(initialSettings)}
                disabled={!hasChanges}
              >
                Reset
              </Button>
              <Button
                onClick={() => {
                  onSave(form);
                  setSaved(true);
                  window.setTimeout(() => setSaved(false), 1800);
                }}
                disabled={!hasChanges}
              >
                Save settings
              </Button>
            </div>
          </div>
        </Surface>

        <Surface className="p-6">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Data Management
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Export a backup file of your workspace or restore from a previous one.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-[var(--foreground)]">
                Local-only data
              </h3>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                Your data is stored strictly in this browser. To move it to another
                device or browse safely, use the export feature below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `work-hub-export-${new Date().toISOString().split("T")[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <DownloadIcon className="h-4 w-4" />
                Export Workspace
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const content = e.target?.result as string;
                      const parsed = JSON.parse(content);
                      const looksLikeExport =
                        parsed &&
                        typeof parsed === "object" &&
                        Array.isArray(parsed.tasks) &&
                        Array.isArray(parsed.projects) &&
                        Array.isArray(parsed.notes) &&
                        Array.isArray(parsed.links) &&
                        Boolean(parsed.settings);

                      if (looksLikeExport) {
                        // Confirm before applying: an import replaces workspace
                        // content, and that change syncs to every member.
                        setImportStatus(null);
                        setPendingImport(parsed as WorkspaceData);
                      } else {
                        setImportStatus(
                          "That file does not look like a Work Hub export.",
                        );
                      }
                    } catch {
                      setImportStatus("Could not read the selected file.");
                    }
                  };
                  reader.readAsText(file);
                  // Reset input so the same file can be uploaded again if needed
                  event.target.value = "";
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="h-4 w-4" />
                Import Workspace
              </Button>
            </div>

            {importStatus ? (
              <p className="text-xs text-[var(--muted)]">{importStatus}</p>
            ) : null}
          </div>
        </Surface>
      </div>

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Replace workspace content?"
        description="Importing overwrites the tasks, projects, notes, links, and recycle bin in this workspace."
        confirmLabel="Import and replace"
        body="Everyone in this workspace sees the imported content once it syncs. Your workspace name, owner, and member list are left unchanged."
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) onImport(pendingImport);
          setPendingImport(null);
          setImportStatus("Workspace imported.");
        }}
      />
    </div>
  );
}
