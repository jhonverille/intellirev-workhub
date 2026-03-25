import type { WorkspaceData } from "@/lib/types";

export const STORAGE_KEY = "work-hub-data-v1";

const now = new Date();

function dateOffset(days: number) {
  const value = new Date(now);
  value.setDate(value.getDate() + days);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timestampOffset(days: number) {
  const value = new Date(now);
  value.setDate(value.getDate() + days);
  return value.toISOString();
}

export const defaultWorkspaceData: WorkspaceData = {
  tasks: [
    {
      id: "task-1",
      title: "Finish weekly planning",
      description:
        "Review priorities, reschedule overflow, and lock in top three outcomes.",
      priority: "high",
      status: "in progress",
      dueDate: dateOffset(0),
      projectId: "project-1",
      completed: false,
      assigneeIds: [],
      createdAt: timestampOffset(-5),
      updatedAt: timestampOffset(-1),
    },
    {
      id: "task-2",
      title: "Draft onboarding checklist",
      description: "Capture the recurring setup steps for new collaborators.",
      priority: "medium",
      status: "to do",
      dueDate: dateOffset(2),
      projectId: "project-2",
      completed: false,
      assigneeIds: [],
      createdAt: timestampOffset(-4),
      updatedAt: timestampOffset(-2),
    },
    {
      id: "task-3",
      title: "Clean up old reference notes",
      description:
        "Archive outdated snippets and merge duplicates into one source of truth.",
      priority: "low",
      status: "done",
      dueDate: dateOffset(-1),
      projectId: null,
      completed: true,
      assigneeIds: [],
      createdAt: timestampOffset(-10),
      updatedAt: timestampOffset(-1),
    },
    {
      id: "task-4",
      title: "Book Q2 review block",
      description:
        "Reserve two uninterrupted hours for the quarterly review session.",
      priority: "high",
      status: "blocked",
      dueDate: dateOffset(1),
      projectId: "project-3",
      completed: false,
      assigneeIds: [],
      createdAt: timestampOffset(-2),
      updatedAt: timestampOffset(0),
    },
  ],
  projects: [
    {
      id: "project-1",
      name: "Personal Operating System",
      description:
        "A lightweight system for planning, review, and energy-aware execution.",
      status: "active",
      deadline: dateOffset(10),
      assigneeIds: [],
      createdAt: timestampOffset(-25),
      updatedAt: timestampOffset(-1),
    },
    {
      id: "project-2",
      name: "Knowledge Base Refresh",
      description:
        "Consolidate playbooks, recurring notes, and reusable templates.",
      status: "planned",
      deadline: dateOffset(18),
      assigneeIds: [],
      createdAt: timestampOffset(-18),
      updatedAt: timestampOffset(-2),
    },
    {
      id: "project-3",
      name: "Quarterly Review",
      description: "Assess wins, lessons, and the few bets that matter next.",
      status: "paused",
      deadline: dateOffset(6),
      assigneeIds: [],
      createdAt: timestampOffset(-14),
      updatedAt: timestampOffset(0),
    },
  ],
  notes: [
    {
      id: "note-1",
      title: "Morning reset ritual",
      content:
        "Review calendar, pick one meaningful outcome, clear one small piece of friction, and start before opening chat.",
      tags: ["ritual", "focus"],
      createdAt: timestampOffset(-8),
      updatedAt: timestampOffset(-1),
    },
    {
      id: "note-2",
      title: "Project kickoff questions",
      content:
        "What does done look like, what is the smallest useful version, and what might quietly slow this down later?",
      tags: ["projects", "planning"],
      createdAt: timestampOffset(-6),
      updatedAt: timestampOffset(-3),
    },
    {
      id: "note-3",
      title: "Useful shortcuts",
      content:
        "Batch low-context tasks after lunch. Protect deep work before noon. Keep reusable links close to the work.",
      tags: ["systems"],
      createdAt: timestampOffset(-3),
      updatedAt: timestampOffset(0),
    },
  ],
  links: [
    {
      id: "link-1",
      title: "Calendar",
      url: "https://calendar.google.com",
      category: "Planning",
      createdAt: timestampOffset(-20),
      updatedAt: timestampOffset(-2),
    },
    {
      id: "link-2",
      title: "Project brief template",
      url: "https://www.notion.so",
      category: "Templates",
      createdAt: timestampOffset(-12),
      updatedAt: timestampOffset(-1),
    },
    {
      id: "link-3",
      title: "Focus playlist",
      url: "https://music.youtube.com",
      category: "Energy",
      createdAt: timestampOffset(-9),
      updatedAt: timestampOffset(0),
    },
  ],
  settings: {
    theme: "system",
    profileName: "Jordan Lee",
    profileRole: "Independent maker",
    preferences: {
      compactMode: false,
      showCompletedTasks: true,
      startWeekOnMonday: true,
    },
  },
  trash: {
    tasks: [],
    projects: [],
    notes: [],
    links: [],
  },
};

export function normalizeWorkspaceData(value: unknown): WorkspaceData {
  if (!value || typeof value !== "object") {
    return defaultWorkspaceData;
  }

  const candidate = value as Partial<WorkspaceData>;
  return {
    id: candidate.id,
    name: candidate.name,
    ownerId: candidate.ownerId,
    members: candidate.members,
    tasks: Array.isArray(candidate.tasks)
      ? candidate.tasks.map(t => ({...t, assigneeIds: t.assigneeIds || []}))
      : defaultWorkspaceData.tasks,
    projects: Array.isArray(candidate.projects)
      ? candidate.projects.map(p => ({...p, assigneeIds: p.assigneeIds || []}))
      : defaultWorkspaceData.projects,
    notes: Array.isArray(candidate.notes)
      ? candidate.notes
      : defaultWorkspaceData.notes,
    links: Array.isArray(candidate.links)
      ? candidate.links
      : defaultWorkspaceData.links,
    trash: {
      tasks: Array.isArray(candidate.trash?.tasks) ? candidate.trash!.tasks : [],
      projects: Array.isArray(candidate.trash?.projects)
        ? candidate.trash!.projects
        : [],
      notes: Array.isArray(candidate.trash?.notes) ? candidate.trash!.notes : [],
      links: Array.isArray(candidate.trash?.links) ? candidate.trash!.links : [],
    },
    settings: {
      ...defaultWorkspaceData.settings,
      ...(candidate.settings ?? {}),
      preferences: {
        ...defaultWorkspaceData.settings.preferences,
        ...(candidate.settings?.preferences ?? {}),
      },
    },
  };
}
