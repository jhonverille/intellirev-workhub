import type { ProjectStatus, TaskPriority, TaskStatus } from "@/lib/types";

export function getTaskStatusTone(status: TaskStatus) {
  switch (status) {
    case "done":
      return "success";
    case "blocked":
      return "danger";
    case "in progress":
      return "accent";
    default:
      return "neutral";
  }
}

export function getTaskPriorityTone(priority: TaskPriority) {
  switch (priority) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "neutral";
  }
}

export function getProjectStatusTone(status: ProjectStatus) {
  switch (status) {
    case "active":
      return "accent";
    case "completed":
      return "success";
    case "paused":
      return "warning";
    default:
      return "neutral";
  }
}
