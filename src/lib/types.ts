export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "to do" | "in progress" | "done" | "blocked";
export type ProjectStatus = "planned" | "active" | "paused" | "completed";
export type ThemePreference = "system" | "light" | "dark";

export type Task = {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  projectId: string | null;
  completed: boolean;
  assigneeIds: string[]; // Added for collaboration
  visibility?: "public" | "private";
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  deadline: string | null;
  assigneeIds: string[]; // Added for collaboration
  visibility?: "public" | "private";
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  visibility?: "public" | "private";
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type QuickLink = {
  id: string;
  title: string;
  url: string;
  category: string;
  visibility?: "public" | "private";
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceSettings = {
  theme: ThemePreference;
  profileName: string;
  profileRole: string;
  preferences: {
    compactMode: boolean;
    showCompletedTasks: boolean;
    startWeekOnMonday: boolean;
  };
};

export type Role = "owner" | "assignee";

export type Member = {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: Role;
  joinedAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, Member>;
  createdAt: string;
  updatedAt: string;
  settings: WorkspaceSettings; // Or keep this separated
};

export type UserDoc = {
  uid: string;
  email: string;
  currentWorkspaceId: string;
  workspaceIds: string[];
};

export type WorkspaceData = {
  id?: string;
  name?: string;
  ownerId?: string;
  members?: Record<string, Member>;
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  links: QuickLink[];
  trash: {
    tasks: Task[];
    projects: Project[];
    notes: Note[];
    links: QuickLink[];
  };
  settings: WorkspaceSettings;
};

export type TaskDraft = Omit<
  Task,
  "id" | "createdAt" | "updatedAt" | "completed"
> & {
  completed?: boolean;
};

export type ProjectDraft = Omit<Project, "id" | "createdAt" | "updatedAt">;
export type NoteDraft = Omit<Note, "id" | "createdAt" | "updatedAt">;
export type QuickLinkDraft = Omit<
  QuickLink,
  "id" | "createdAt" | "updatedAt"
>;
