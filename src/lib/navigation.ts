import type { ProjectStatus, TaskPriority, TaskStatus } from "@/lib/types";

export const appNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/notes", label: "Notes", icon: "notes" },
  { href: "/links", label: "Quick Links", icon: "links" },
  { href: "/team", label: "Team", icon: "team" },
  { href: "/trash", label: "Trash", icon: "trash" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/calendar": "Calendar",
  "/tasks": "Tasks",
  "/notes": "Notes",
  "/links": "Quick Links",
  "/team": "Team",
  "/trash": "Trash",
  "/settings": "Settings",
};

export const taskStatuses: TaskStatus[] = [
  "to do",
  "in progress",
  "blocked",
  "done",
];

export const taskPriorities: TaskPriority[] = ["low", "medium", "high"];

export const projectStatuses: ProjectStatus[] = [
  "planned",
  "active",
  "paused",
  "completed",
];
