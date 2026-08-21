"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  defaultWorkspaceData,
  normalizeWorkspaceData,
  STORAGE_KEY,
} from "@/lib/default-data";
import type {
  AssignmentRequest,
  Note,
  NoteDraft,
  Project,
  ProjectDraft,
  QuickLink,
  QuickLinkDraft,
  Role,
  Task,
  TaskDraft,
  ThemePreference,
  WorkspaceData,
  WorkspaceSettings,
  ActivityEvent,
} from "@/lib/types";
import { makeId } from "@/lib/utils";
import {
  combineById,
  combineCollections,
  diffItems,
  fromStoredItems,
  isOwnerOnly,
  ITEMS_COLLECTION,
  ITEMS_SCHEMA_VERSION,
  REQUESTS_COLLECTION,
  sameItem,
  toStoredItems,
  type StoredItem,
} from "@/lib/workspace-items";
import { auth, db, googleProvider } from "./firebase";
import { usePathname } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { doc, deleteDoc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, collection, addDoc } from "firebase/firestore";

type WorkspaceContextValue = {
  data: WorkspaceData;
  initialized: boolean;
  storageError: string | null;
  resolvedTheme: "light" | "dark";
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  createTask: (draft: TaskDraft) => void;
  updateTask: (id: string, draft: TaskDraft) => void;
  deleteTask: (id: string) => void;
  deleteTasks: (ids: string[]) => void;
  toggleTaskCompletion: (id: string) => void;
  createProject: (draft: ProjectDraft) => void;
  updateProject: (id: string, draft: ProjectDraft) => void;
  deleteProject: (id: string) => void;
  deleteProjects: (ids: string[]) => void;
  createNote: (draft: NoteDraft) => void;
  updateNote: (id: string, draft: NoteDraft) => void;
  deleteNote: (id: string) => void;
  deleteNotes: (ids: string[]) => void;
  createLink: (draft: QuickLinkDraft) => void;
  updateLink: (id: string, draft: QuickLinkDraft) => void;
  deleteLink: (id: string) => void;
  deleteLinks: (ids: string[]) => void;
  requestAssignment: (itemId: string, itemType: "project" | "task", itemName: string, toId: string) => void;
  respondToAssignment: (requestId: string, status: "accepted" | "declined") => void;
  restoreItem: (type: keyof WorkspaceData["trash"], id: string) => void;
  permanentDeleteItem: (type: keyof WorkspaceData["trash"], id: string) => void;
  emptyTrash: () => void;
  undoLastDeletion: () => void;
  lastDeletedItem: { type: keyof WorkspaceData["trash"]; id: string } | null;
  setLastDeletedItem: (item: { type: keyof WorkspaceData["trash"]; id: string } | null) => void;
  updateSettings: (settings: WorkspaceSettings) => void;
  setTheme: (theme: ThemePreference) => void;
  replaceData: (data: WorkspaceData) => void;
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isSyncing: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  clearAuthError: () => void;
  currentWorkspaceId: string | null;
  workspaceLoadError: string | null;
  userRole: Role;
};

type State = {
  data: WorkspaceData;
  searchQuery: string;
};

type Action =
  | { type: "replace"; payload: WorkspaceData }
  | { type: "set-search"; payload: string }
  | { type: "upsert-task"; payload: Task }
  | { type: "delete-task"; payload: string }
  | { type: "delete-tasks"; payload: string[] }
  | { type: "toggle-task"; payload: string }
  | { type: "upsert-project"; payload: Project }
  | { type: "delete-project"; payload: string }
  | { type: "delete-projects"; payload: string[] }
  | { type: "upsert-note"; payload: Note }
  | { type: "delete-note"; payload: string }
  | { type: "delete-notes"; payload: string[] }
  | { type: "upsert-link"; payload: QuickLink }
  | { type: "delete-link"; payload: string }
  | { type: "delete-links"; payload: string[] }
  | { type: "send-assignment-request"; payload: AssignmentRequest }
  | { type: "respond-to-assignment-request"; payload: { requestId: string; status: "accepted" | "declined" } }
  | { type: "restore-item"; payload: { type: keyof WorkspaceData["trash"]; id: string } }
  | {
      type: "permanent-delete";
      payload: { type: keyof WorkspaceData["trash"]; id: string };
    }
  | { type: "empty-trash" }
  | { type: "update-settings"; payload: WorkspaceSettings };

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
  const index = items.findIndex((item) => item.id === nextItem.id);

  if (index === -1) {
    return [nextItem, ...items];
  }

  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

function workspaceReducer(state: State, action: Action): State {
  switch (action.type) {
    case "replace":
      return { ...state, data: action.payload };
    case "set-search":
      return { ...state, searchQuery: action.payload };
    case "upsert-task":
      return {
        ...state,
        data: {
          ...state.data,
          tasks: upsertById(state.data.tasks, action.payload),
        },
      };
    case "toggle-task":
      return {
        ...state,
        data: {
          ...state.data,
          tasks: state.data.tasks.map((task) =>
            task.id === action.payload
              ? {
                  ...task,
                  completed: !task.completed,
                  status: !task.completed ? "done" : "to do",
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        },
      };
    case "upsert-project":
      return {
        ...state,
        data: {
          ...state.data,
          projects: upsertById(state.data.projects, action.payload),
        },
      };
    case "upsert-note":
      return {
        ...state,
        data: {
          ...state.data,
          notes: upsertById(state.data.notes, action.payload),
        },
      };
    case "upsert-link":
      return {
        ...state,
        data: {
          ...state.data,
          links: upsertById(state.data.links, action.payload),
        },
      };
    case "delete-task": {
      const task = state.data.tasks.find((t) => t.id === action.payload);
      if (!task) return state;
      return {
        ...state,
        data: {
          ...state.data,
          tasks: state.data.tasks.filter((t) => t.id !== action.payload),
          trash: {
            ...state.data.trash,
            tasks: [task, ...state.data.trash.tasks],
          },
        },
      };
    }
    case "delete-project": {
      const project = state.data.projects.find((p) => p.id === action.payload);
      if (!project) return state;
      return {
        ...state,
        data: {
          ...state.data,
          projects: state.data.projects.filter((p) => p.id !== action.payload),
          trash: {
            ...state.data.trash,
            projects: [project, ...state.data.trash.projects],
          },
          // Keep tasks project affinity for now so they are restored correctly
          // but they won't show up in any project lists because the project is "gone"
        },
      };
    }
    case "delete-note": {
      const note = state.data.notes.find((n) => n.id === action.payload);
      if (!note) return state;
      return {
        ...state,
        data: {
          ...state.data,
          notes: state.data.notes.filter((n) => n.id !== action.payload),
          trash: {
            ...state.data.trash,
            notes: [note, ...state.data.trash.notes],
          },
        },
      };
    }
    case "delete-link": {
      const link = state.data.links.find((l) => l.id === action.payload);
      if (!link) return state;
      return {
        ...state,
        data: {
          ...state.data,
          links: state.data.links.filter((l) => l.id !== action.payload),
          trash: {
            ...state.data.trash,
            links: [link, ...state.data.trash.links],
          },
        },
      };
    }
    case "delete-tasks": {
      const ids = action.payload;
      const tasksToDelete = state.data.tasks.filter((t) => ids.includes(t.id));
      if (tasksToDelete.length === 0) return state;
      return {
        ...state,
        data: {
          ...state.data,
          tasks: state.data.tasks.filter((t) => !ids.includes(t.id)),
          trash: {
            ...state.data.trash,
            tasks: [...tasksToDelete, ...state.data.trash.tasks],
          },
        },
      };
    }
    case "delete-projects": {
      const ids = action.payload;
      const projectsToDelete = state.data.projects.filter((p) => ids.includes(p.id));
      if (projectsToDelete.length === 0) return state;
      return {
        ...state,
        data: {
          ...state.data,
          projects: state.data.projects.filter((p) => !ids.includes(p.id)),
          trash: {
            ...state.data.trash,
            projects: [...projectsToDelete, ...state.data.trash.projects],
          },
        },
      };
    }
    case "delete-notes": {
      const ids = action.payload;
      const notesToDelete = state.data.notes.filter((n) => ids.includes(n.id));
      if (notesToDelete.length === 0) return state;
      return {
        ...state,
        data: {
          ...state.data,
          notes: state.data.notes.filter((n) => !ids.includes(n.id)),
          trash: {
            ...state.data.trash,
            notes: [...notesToDelete, ...state.data.trash.notes],
          },
        },
      };
    }
    case "delete-links": {
      const ids = action.payload;
      const linksToDelete = state.data.links.filter((l) => ids.includes(l.id));
      if (linksToDelete.length === 0) return state;
      return {
        ...state,
        data: {
          ...state.data,
          links: state.data.links.filter((l) => !ids.includes(l.id)),
          trash: {
            ...state.data.trash,
            links: [...linksToDelete, ...state.data.trash.links],
          },
        },
      };
    }
    case "restore-item": {
      const { type, id } = action.payload;
      const binned = state.data.trash[type] as (Task | Project | Note | QuickLink)[];
      const item = binned.find((i) => i.id === id);
      if (!item) return state;

      return {
        ...state,
        data: {
          ...state.data,
          [type]: [item, ...(state.data[type] as (Task | Project | Note | QuickLink)[])],
          trash: {
            ...state.data.trash,
            [type]: (state.data.trash[type] as (Task | Project | Note | QuickLink)[]).filter((i) => i.id !== id),
          },
        },
      };
    }
    case "permanent-delete": {
      const { type, id } = action.payload;
      return {
        ...state,
        data: {
          ...state.data,
          trash: {
            ...state.data.trash,
            [type]: (state.data.trash[type] as (Task | Project | Note | QuickLink)[]).filter((i) => i.id !== id),
          },
        },
      };
    }
    case "empty-trash":
      return {
        ...state,
        data: {
          ...state.data,
          trash: {
            tasks: [],
            projects: [],
            notes: [],
            links: [],
          },
        },
      };
    case "update-settings":
      return {
        ...state,
        data: {
          ...state.data,
          settings: action.payload,
        },
      };
    case "send-assignment-request": {
      const isDuplicate = state.data.assignmentRequests?.some(
        (r) =>
          r.itemId === action.payload.itemId &&
          r.toId === action.payload.toId &&
          r.status === "pending"
      );
      if (isDuplicate) {
        console.log("[WorkHub] Duplicate assignment request already pending — skipped.");
        return state;
      }
      return {
        ...state,
        data: {
          ...state.data,
          assignmentRequests: [
            ...(state.data.assignmentRequests || []),
            action.payload,
          ],
        },
      };
    }
    case "respond-to-assignment-request": {
      const { requestId, status } = action.payload;
      const request = state.data.assignmentRequests?.find((r) => r.id === requestId);
      if (!request) return state;

      const updatedProjects =
        status === "accepted" && request.itemType === "project"
          ? (() => {
              const exists = state.data.projects.some((p) => p.id === request.itemId);
              if (!exists) {
                console.warn(`[WorkHub] Project ${request.itemId} no longer exists for request ${requestId}`);
                return state.data.projects;
              }
              return state.data.projects.map((p) =>
                p.id === request.itemId
                  ? { ...p, assigneeIds: [...new Set([...p.assigneeIds, request.toId])] }
                  : p
              );
            })()
          : state.data.projects;

      const updatedTasks =
        status === "accepted" && request.itemType === "task"
          ? (() => {
              const exists = state.data.tasks.some((t) => t.id === request.itemId);
              if (!exists) {
                console.warn(`[WorkHub] Task ${request.itemId} no longer exists for request ${requestId}`);
                return state.data.tasks;
              }
              return state.data.tasks.map((t) =>
                t.id === request.itemId
                  ? { ...t, assigneeIds: [...new Set([...t.assigneeIds, request.toId])] }
                  : t
              );
            })()
          : state.data.tasks;

      return {
        ...state,
        data: {
          ...state.data,
          projects: updatedProjects,
          tasks: updatedTasks,
          assignmentRequests: state.data.assignmentRequests?.filter((r) => r.id !== requestId),
        },
      };
    }
    default:
      return state;
  }
}

function resolveTheme(theme: ThemePreference) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return theme;
}

/**
 * Produces a stable JSON hash by sorting object keys recursively.
 * This prevents false "data changed" positives caused by field-order
 * differences between what the client writes and what Firestore returns.
 */
function stableHash(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableHash).join(",")}]`;
  const sorted = Object.keys(value as object)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableHash((value as Record<string, unknown>)[k])}`);
  return `{${sorted.join(",")}}`;
}

/**
 * Membership and workspace identity are owner-only in firestore.rules. Ordinary
 * data sync must not carry them: a member copy can be one snapshot behind, and
 * echoing a stale members map would either be rejected by the rules or (before
 * them) silently revert someone who just joined.
 */
/**
 * Firestore rejects `undefined` field values outright — one undefined optional
 * field (an unset `visibility`, say) throws and takes the entire sync write with
 * it. Optional fields are pervasive in the domain model, so drop the empty keys
 * on the way out instead of enabling `ignoreUndefinedProperties` globally, which
 * would hide the same mistake in writes that do matter.
 */
/**
 * Data arriving from a user-supplied export file. It is normalised so missing
 * collections (a file with no `trash`, say) cannot reach the reducer and crash
 * the pages that read them, and workspace identity plus membership are carried
 * over from live state: an import brings content, never who owns the workspace
 * or who belongs to it.
 */
function prepareImportedData(
  imported: unknown,
  current: WorkspaceData,
): WorkspaceData {
  return {
    ...normalizeWorkspaceData(imported),
    id: current.id,
    name: current.name,
    ownerId: current.ownerId,
    members: current.members,
  };
}

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      result[key] = sanitizeForFirestore(item);
    }
    return result as T;
  }

  return value;
}

function stripOwnerOnlyFields(data: WorkspaceData): WorkspaceData {
  const next = { ...data };
  delete next.members;
  delete next.ownerId;
  delete next.id;
  return next;
}

/**
 * Writes a single activity event to the `activity` subcollection of the workspace.
 * Private items are never logged — the caller is responsible for this guard.
 */
function logActivity({
  user,
  workspaceId,
  action,
  entityType,
  entityName,
}: {
  user: { uid: string; displayName: string | null; photoURL: string | null };
  workspaceId: string;
  action: ActivityEvent["action"];
  entityType: ActivityEvent["entityType"];
  entityName: string;
}) {
  const activityRef = collection(db, "workspaces", workspaceId, "activity");
  const event: Omit<ActivityEvent, "id"> = {
    workspaceId,
    userId: user.uid,
    userDisplayName: user.displayName ?? "Unknown",
    userPhotoURL: user.photoURL,
    action,
    entityType,
    entityName,
    timestamp: new Date().toISOString(),
  };
  addDoc(activityRef, event).catch((err) =>
    console.warn("[WorkHub] Activity log write failed:", err),
  );
}

export function WorkHubProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, {
    data: defaultWorkspaceData,
    searchQuery: "",
  });
  const [initialized, setInitialized] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [lastDeletedItem, setLastDeletedItem] = useState<{
    type: keyof WorkspaceData["trash"];
    id: string;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [remoteDataHash, setRemoteDataHash] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [workspaceLoadError, setWorkspaceLoadError] = useState<string | null>(null);
  // Layout of the workspace being synced, and whether its item documents have
  // been read once. Writing before that first read would republish stale local
  // content over a workspace this client has not seen yet.
  const [itemsSchemaVersion, setItemsSchemaVersion] = useState<number | null>(null);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const pathname = usePathname();

  // Clear auth error when the user navigates
  useEffect(() => {
    setAuthError(null);
  }, [pathname]);

  // 1. Initial Local Storage Load
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = normalizeWorkspaceData(JSON.parse(stored));
        dispatch({ type: "replace", payload: parsed });
      }
    } catch (err) {
      console.error("[WorkHub] Local storage load error:", err);
      setStorageError("Failed to load local data.");
    }
  }, []);

  // 2. Auth & User Profile Lifecycle
  useEffect(() => {
    let isMounted = true;
    let userUnsubscribe: (() => void) | null = null;

    // Capture the result of a redirect sign-in if the user was just redirected back
    getRedirectResult(auth).catch((err) => {
      console.error("[WorkHub] Redirect sign-in error:", err);
      setAuthError(err.message || "Redirect sign-in failed.");
    });

    console.log("[WorkHub] Initializing Auth listener");
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[WorkHub] Auth State:", firebaseUser ? `User(${firebaseUser.uid})` : "Null");
      // Account Switch Protection: If the user changed, wipe the slate clean before syncing
      if (firebaseUser && user && firebaseUser.uid !== user.uid) {
        console.warn("[WorkHub] Account switch detected. Sanitizing data.");
        dispatch({ type: "replace", payload: normalizeWorkspaceData({}) });
        setRemoteDataHash(null);
        window.localStorage.removeItem(STORAGE_KEY);
      }

      setUser(firebaseUser);
      if (firebaseUser) {
        setAuthError(null);
      }


      // Cleanup any previous snapshot listener
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (!firebaseUser) {
        if (isMounted) {
          console.log("[WorkHub] User logged out. Wiping state.");
          setCurrentWorkspaceId(null);
          // Only mark as initialized AFTER resetting state to prevent stale sync
          window.localStorage.removeItem(STORAGE_KEY);
          dispatch({ type: "replace", payload: normalizeWorkspaceData({}) });
          setRemoteDataHash(null);
          setInitialized(true);
        }
        return;
      }

      setWorkspaceLoadError(null);
      const userDocRef = doc(db, "users", firebaseUser.uid);

      try {
        // Ensure user document exists (Migration/New User)
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists() && isMounted) {
          console.log("[WorkHub] Creating missing user document");
          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err: unknown) {
        console.error("[WorkHub] User doc check/create error:", err);
        if (isMounted) {
          setWorkspaceLoadError(
            err instanceof Error ? err.message : "Failed to connect to user profile.",
          );
          setInitialized(true);
          return;
        }
      }

      // Start listening to the user document for workspace changes
      userUnsubscribe = onSnapshot(userDocRef, async (snap) => {
        if (!isMounted) return;
        
        if (snap.exists()) {
          const userData = snap.data();
          const targetId = userData.currentWorkspaceId || userData.workspaceIds?.[0];
          
          if (targetId) {
            console.log("[WorkHub] Target Workspace:", targetId);
            setCurrentWorkspaceId(targetId);
          } else {
            // Self-healing: create a default workspace if none exists
            console.log("[WorkHub] Creating first workspace");
            const newWsId = makeId();
            const timestamp = new Date().toISOString();
            // New workspaces start on the item-document layout, so no content
            // arrays go on the workspace document. The seed items are written as
            // documents by the persist effect once the first snapshot lands.
            await setDoc(doc(db, "workspaces", newWsId), sanitizeForFirestore({
              schemaVersion: ITEMS_SCHEMA_VERSION,
              settings: state.data.settings,
              assignmentRequests: [],
              id: newWsId,
              name: "My Workspace",
              ownerId: firebaseUser.uid,
              members: {
                [firebaseUser.uid]: {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  photoURL: firebaseUser.photoURL,
                  role: "owner",
                  joinedAt: timestamp,
                }
              },
              createdAt: timestamp,
              updatedAt: timestamp,
            }));
            await updateDoc(userDocRef, {
              currentWorkspaceId: newWsId,
              workspaceIds: arrayUnion(newWsId)
            });
            setCurrentWorkspaceId(newWsId);
          }
        }
        setInitialized(true);
      }, (err) => {
        console.error("[WorkHub] User snapshot error:", err);
        if (isMounted) {
          setWorkspaceLoadError("Lost connection to user profile. Please check your internet.");
          setInitialized(true);
        }
      });
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  // Ids written to storage but not yet seen echoed back. The local copy of
  // these wins during a merge; everything else defers to storage.
  const pendingItemIdsRef = useRef<Set<string>>(new Set());
  const remoteItemsRef = useRef<Map<string, StoredItem>>(new Map());
  const pendingRequestIdsRef = useRef<Set<string>>(new Set());
  const lastPrivateWriteHashRef = useRef<string | null>(null);
  // Read by the request handlers, which are created once per context value and
  // would otherwise close over a stale layout flag.
  const itemsSchemaVersionRef = useRef<number | null>(null);
  const stateDataRef = useRef(state.data);
  useEffect(() => {
    stateDataRef.current = state.data;
  }, [state.data]);

  // 3. Workspace Sync (Remote -> Local)
  useEffect(() => {
    if (!user || !initialized || !currentWorkspaceId) {
      if (initialized && !currentWorkspaceId) setIsSyncing((prev) => (prev ? false : prev));
      return;
    }

    const wsDocRef = doc(db, "workspaces", currentWorkspaceId);
    const privateWsRef = doc(db, "private_workspaces", `${currentWorkspaceId}_${user.uid}`);
    const itemsRef = collection(db, "workspaces", currentWorkspaceId, ITEMS_COLLECTION);
    const requestsRef = collection(db, "workspaces", currentWorkspaceId, REQUESTS_COLLECTION);
    console.log("[WorkHub] Syncing workspace:", currentWorkspaceId);
    setIsSyncing(true);

    let lastPublicData: WorkspaceData | null = null;
    let lastPrivateData: WorkspaceData | null = null;
    // Settings are personal, but older workspaces stored them in the shared doc.
    // Until this member has a private doc, fall back to the shared copy so their
    // first load carries the workspace settings over.
    let lastPrivateExists = false;
    // Settings hydrate once and are then owned locally. Every other field is
    // merged as a union, which tolerates a stale snapshot; a whole-value field
    // does not. Re-adopting settings from every snapshot made the listeners
    // fight: the shared write echoes before the private one lands, so one echo
    // pushed the old theme back while the next pushed the new one forward.
    let settingsSource: "none" | "shared" | "private" = "none";
    // null until the first item snapshot arrives.
    let remoteItems: Map<string, StoredItem> | null = null;
    let remoteRequests: AssignmentRequest[] = [];
    let migrationStarted = false;
    let hydrationSeeded = false;

    /**
     * Copy a legacy workspace's arrays into item documents, then mark the
     * document migrated. Only the owner runs this, so two members cannot race
     * writing the same documents; everyone else keeps reading the arrays until
     * the flag flips.
     */
    const migrateLegacyWorkspace = async (legacy: WorkspaceData) => {
      migrationStarted = true;
      const legacyItems = [...toStoredItems(legacy).values()];
      const legacyRequests = legacy.assignmentRequests || [];
      console.log("[WorkHub] Migrating items to documents:", legacyItems.length);

      try {
        await Promise.all([
          ...legacyItems.map((item) =>
            setDoc(
              doc(db, "workspaces", currentWorkspaceId, ITEMS_COLLECTION, item.id),
              sanitizeForFirestore(item),
            ),
          ),
          ...legacyRequests.map((request) =>
            setDoc(
              doc(db, "workspaces", currentWorkspaceId, REQUESTS_COLLECTION, request.id),
              sanitizeForFirestore(request),
            ),
          ),
        ]);
        await updateDoc(wsDocRef, { schemaVersion: ITEMS_SCHEMA_VERSION });
        console.log("[WorkHub] Migration complete");
      } catch (err) {
        // Leave the flag unset so the next snapshot retries rather than leaving
        // the workspace half-migrated.
        migrationStarted = false;
        console.error("[WorkHub] Migration failed:", err);
      }
    };

    const mergeAndDispatch = () => {
      // Always wait for the workspace document before merging. It is the source
      // of truth for membership and assignmentRequests, and it says which
      // storage layout to read. If only another listener has fired, bail out —
      // this one will fire shortly and trigger a proper merge then.
      if (!lastPublicData) return;

      const base = lastPublicData;
      const migrated = base.schemaVersion === ITEMS_SCHEMA_VERSION;

      // Once migrated, content lives in the subcollection. Wait for its first
      // snapshot so this client cannot merge — and then republish — a workspace
      // it has not actually read yet.
      if (migrated && !remoteItems) return;

      const priv = lastPrivateData || normalizeWorkspaceData({});
      const current = stateDataRef.current;

      const shared = migrated
        ? fromStoredItems((remoteItems as Map<string, StoredItem>).values())
        : {
            tasks: base.tasks,
            projects: base.projects,
            notes: base.notes,
            links: base.links,
            trash: base.trash,
          };

      const combined = combineCollections(
        shared,
        {
          tasks: priv.tasks,
          projects: priv.projects,
          notes: priv.notes,
          links: priv.links,
          trash: priv.trash,
        },
        current,
        migrated
          ? { localPriorityIds: pendingItemIdsRef.current }
          : // Legacy mode has no per-item diff, so local items the snapshot has
            // not caught up with have to be retained by hand.
            { retainUnknownLocals: true },
      );

      // Migrated workspaces keep each request in its own document, so answering
      // one cannot disturb another. Legacy workspaces still carry the array on
      // the workspace document; union it by id there.
      const mergeRequests = () => {
        if (migrated) {
          return combineById(
            remoteRequests,
            current.assignmentRequests || [],
            pendingRequestIdsRef.current,
          );
        }

        const byId = new Map<string, AssignmentRequest>();
        for (const request of base.assignmentRequests || []) byId.set(request.id, request);
        for (const request of priv.assignmentRequests || []) byId.set(request.id, request);
        for (const request of current.assignmentRequests || []) {
          if (!byId.has(request.id)) byId.set(request.id, request);
        }
        return [...byId.values()];
      };

      // Adopt the private doc's settings the first time it appears (a returning
      // member), or the shared doc's once while no private doc exists (migration
      // from when settings were workspace-wide). After that the local value wins
      // and syncs outward.
      const resolveSettings = () => {
        if (lastPrivateExists && settingsSource !== "private") {
          settingsSource = "private";
          return priv.settings;
        }
        if (!lastPrivateExists && settingsSource === "none") {
          settingsSource = "shared";
          return base.settings;
        }
        return current.settings;
      };

      const mergedData: WorkspaceData = {
        ...base,
        ...combined,
        assignmentRequests: mergeRequests(),
        settings: resolveSettings(),
      };

      const remoteHash = stableHash(mergedData);
      const localHash = stableHash(current);

      setRemoteDataHash(remoteHash);
      if (remoteHash !== localHash) {
        console.log("[WorkHub] Remote update detected. Merging.");
        dispatch({ type: "replace", payload: mergedData });
      }
    };

    const unsubPublic = onSnapshot(wsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        lastPublicData = normalizeWorkspaceData(snapshot.data());
        itemsSchemaVersionRef.current = lastPublicData.schemaVersion ?? 1;
        setItemsSchemaVersion(lastPublicData.schemaVersion ?? 1);

        if (
          lastPublicData.schemaVersion !== ITEMS_SCHEMA_VERSION &&
          lastPublicData.ownerId === user.uid &&
          !migrationStarted
        ) {
          void migrateLegacyWorkspace(lastPublicData);
        }
      } else {
        setWorkspaceLoadError("Workspace not found or access denied.");
      }
      mergeAndDispatch();
      setIsSyncing(false);
    }, (err) => {
      console.error("[WorkHub] Workspace sync error:", err);
      setWorkspaceLoadError("Failed to connect to workspace.");
      setIsSyncing(false);
    });

    const unsubItems = onSnapshot(itemsRef, (snapshot) => {
      const next = new Map<string, StoredItem>();
      snapshot.docs.forEach((docSnapshot) => {
        next.set(docSnapshot.id, {
          ...(docSnapshot.data() as StoredItem),
          id: docSnapshot.id,
        });
      });
      remoteItems = next;
      remoteItemsRef.current = next;

      // First snapshot: anything the cached workspace holds that storage does
      // not is a local change made while offline (an edit, or a deletion that
      // never reached the server). Mark those ids pending so the merge keeps
      // them and the persist effect writes them out, instead of the snapshot
      // silently reverting work.
      //
      // Only for a cache belonging to this workspace: a fresh browser starts on
      // demo seed data with no workspace id, and that must never be published
      // into a workspace the member has just joined.
      if (!hydrationSeeded) {
        hydrationSeeded = true;
        const cached = stateDataRef.current;
        if (cached.id === currentWorkspaceId) {
          // Writes only. A document present remotely but absent locally is
          // another member's item this client has simply never seen.
          const { writes } = diffItems(toStoredItems(cached), next);
          for (const item of writes) pendingItemIdsRef.current.add(item.id);
        }
      }

      // Retire pending ids the snapshot has caught up with, so storage resumes
      // being authoritative for them.
      if (pendingItemIdsRef.current.size > 0) {
        const desired = toStoredItems(stateDataRef.current);
        for (const id of [...pendingItemIdsRef.current]) {
          const wanted = desired.get(id);
          const stored = next.get(id);
          const settled = wanted ? Boolean(stored && sameItem(stored, wanted)) : !stored;
          if (settled) pendingItemIdsRef.current.delete(id);
        }
      }

      setItemsLoaded(true);
      mergeAndDispatch();
      setIsSyncing(false);
    }, (err) => {
      console.error("[WorkHub] Item sync error:", err);
      setWorkspaceLoadError("Failed to load workspace content.");
      setIsSyncing(false);
    });

    const unsubRequests = onSnapshot(requestsRef, (snapshot) => {
      remoteRequests = snapshot.docs.map((docSnapshot) => ({
        ...(docSnapshot.data() as AssignmentRequest),
        id: docSnapshot.id,
      }));

      // Retire pending ids the snapshot has caught up with.
      if (pendingRequestIdsRef.current.size > 0) {
        const remoteById = new Map(remoteRequests.map((request) => [request.id, request]));
        const localIds = new Set(
          (stateDataRef.current.assignmentRequests || []).map((request) => request.id),
        );
        for (const id of [...pendingRequestIdsRef.current]) {
          const settled = localIds.has(id) ? remoteById.has(id) : !remoteById.has(id);
          if (settled) pendingRequestIdsRef.current.delete(id);
        }
      }

      mergeAndDispatch();
    }, (err) => {
      console.error("[WorkHub] Assignment request sync error:", err);
    });

    const unsubPrivate = onSnapshot(privateWsRef, (snapshot) => {
      if (snapshot.exists()) {
        lastPrivateData = normalizeWorkspaceData(snapshot.data());
        lastPrivateExists = true;
      } else {
        lastPrivateData = normalizeWorkspaceData({});
        lastPrivateExists = false;
      }
      mergeAndDispatch();
    }, (err) => {
      console.error("[WorkHub] Private workspace sync error:", err);
    });

    return () => {
      unsubPublic();
      unsubItems();
      unsubRequests();
      unsubPrivate();
    };
  }, [user, initialized, currentWorkspaceId]);

  // Persist to LocalStorage AND Firestore
  useEffect(() => {
    if (!initialized) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      setStorageError((prev) => (prev === null ? prev : null));

      if (!user || !currentWorkspaceId) {
        return;
      }

      // An item is the owner's alone only while it has no assignees. A private
      // item that has been shared with specific members must live in shared
      // storage, or those members cannot read it at all.
      const isPrivateItem = (item: {
        visibility?: "public" | "private";
        assigneeIds?: string[];
      }) => isOwnerOnly(item);
      const isSharedItem = (item: {
        visibility?: "public" | "private";
        assigneeIds?: string[];
      }) => !isOwnerOnly(item);

      /**
       * This member's own items and preferences. Trash is filtered too: sending
       * the whole bin put other members' deleted items in a document only this
       * member can read, and this member's private deletions in the shared one.
       */
      const buildPrivateData = (): WorkspaceData => ({
        ...state.data,
        members: {}, // Skip member map in private
        tasks: state.data.tasks.filter(isPrivateItem),
        projects: state.data.projects.filter(isPrivateItem),
        notes: state.data.notes.filter(isPrivateItem),
        links: state.data.links.filter(isPrivateItem),
        trash: {
          tasks: state.data.trash.tasks.filter(isPrivateItem),
          projects: state.data.trash.projects.filter(isPrivateItem),
          notes: state.data.trash.notes.filter(isPrivateItem),
          links: state.data.trash.links.filter(isPrivateItem),
        },
        // Requests live on the workspace document only. Writing [] here keeps the
        // per-user doc authoritative-empty, so a private doc written by an older
        // build cannot feed stale requests back through the merge.
        assignmentRequests: [],
      });

      /** Written only when its content actually changed. */
      const writePrivateDataIfChanged = () => {
        const privateData = buildPrivateData();
        const privateHash = stableHash(privateData);
        if (privateHash === lastPrivateWriteHashRef.current) {
          return null;
        }
        lastPrivateWriteHashRef.current = privateHash;
        return setDoc(
          doc(db, "private_workspaces", `${currentWorkspaceId}_${user.uid}`),
          sanitizeForFirestore(privateData),
          { merge: true },
        );
      };

      if (itemsSchemaVersion === ITEMS_SCHEMA_VERSION) {
        // CLOBBERING PROTECTION: only write once the item documents have been
        // read, so a client that has just signed in cannot publish its local
        // seed data over a workspace it has not seen.
        if (!itemsLoaded) {
          return;
        }

        const { writes, deletes } = diffItems(
          toStoredItems(state.data),
          remoteItemsRef.current,
        );
        const privatePromise = writePrivateDataIfChanged();

        if (writes.length === 0 && deletes.length === 0) {
          if (privatePromise) {
            setIsSyncing(true);
            privatePromise.finally(() => setIsSyncing(false));
          }
          return;
        }

        setIsSyncing(true);
        for (const item of writes) pendingItemIdsRef.current.add(item.id);
        for (const id of deletes) pendingItemIdsRef.current.add(id);

        const operations: Array<Promise<unknown>> = [
          ...writes.map((item) =>
            setDoc(
              doc(db, "workspaces", currentWorkspaceId, ITEMS_COLLECTION, item.id),
              sanitizeForFirestore(item),
            ),
          ),
          ...deletes.map((id) =>
            deleteDoc(doc(db, "workspaces", currentWorkspaceId, ITEMS_COLLECTION, id)),
          ),
        ];
        if (privatePromise) operations.push(privatePromise);

        Promise.all(operations).finally(() => setIsSyncing(false));
        return;
      }

      // Legacy whole-document write, used until the owner migrates this
      // workspace. Two members editing different items still clobber each other
      // here — ending that is what the migration above is for.
      if (remoteDataHash !== null && stableHash(state.data) !== remoteDataHash) {
        setIsSyncing(true);

        const baseData = state.data;

        // Partial: the shared document deliberately omits the personal and
        // owner-only fields, so it is not a whole WorkspaceData.
        const publicData: Partial<WorkspaceData> = {
          ...stripOwnerOnlyFields(baseData),
          tasks: baseData.tasks.filter(isSharedItem),
          projects: baseData.projects.filter(isSharedItem),
          notes: baseData.notes.filter(isSharedItem),
          links: baseData.links.filter(isSharedItem),
          trash: {
            tasks: baseData.trash.tasks.filter(isSharedItem),
            projects: baseData.trash.projects.filter(isSharedItem),
            notes: baseData.trash.notes.filter(isSharedItem),
            links: baseData.trash.links.filter(isSharedItem),
          },
        };

        // assignmentRequests is intentionally excluded from this write.
        // Requests are written atomically via arrayUnion in requestAssignment()
        // and removed directly via updateDoc in respondToAssignment().
        // Including them in a full-doc setDoc would let any member's stale local
        // state silently overwrite requests they haven't received yet.
        // The key is deleted rather than set to undefined: Firestore rejects
        // undefined field values outright, which failed the whole sync write.
        delete publicData.assignmentRequests;

        // Settings are per-member (theme, display name, list preferences) and
        // live in the private doc. Writing them here made one member's theme
        // change the theme for the whole workspace.
        delete publicData.settings;

        const publicPromise = setDoc(
          doc(db, "workspaces", currentWorkspaceId),
          sanitizeForFirestore(publicData),
          { merge: true },
        );
        const privatePromise = writePrivateDataIfChanged();

        Promise.all([publicPromise, privatePromise].filter(Boolean)).finally(() =>
          setIsSyncing(false),
        );
      }
    } catch {
      setStorageError(
        "Work Hub could not save your latest changes. Your current session still works, but changes may not persist.",
      );
    }
  }, [
    initialized,
    state.data,
    user,
    remoteDataHash,
    currentWorkspaceId,
    itemsSchemaVersion,
    itemsLoaded,
  ]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const root = document.documentElement;
    const applyTheme = () => {
      const theme = resolveTheme(state.data.settings.theme);
      root.classList.toggle("dark", theme === "dark");
      root.dataset.theme = theme;
      setResolvedTheme(theme);
    };

    applyTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [initialized, state.data.settings.theme]);

  const contextValue: WorkspaceContextValue = useMemo(
    () => ({
      data: state.data,
      initialized,
      storageError,
      resolvedTheme,
      searchQuery: state.searchQuery,
      setSearchQuery: (payload: string) => dispatch({ type: "set-search", payload }),
      createTask: (draft: TaskDraft) => {
        const timestamp = new Date().toISOString();
        let visibility = draft.visibility;
        let ownerId = draft.ownerId;
        
        if (draft.projectId) {
          const matchedProject = state.data.projects.find(p => p.id === draft.projectId);
          if (matchedProject && matchedProject.visibility === "private") {
            visibility = "private";
            ownerId = matchedProject.ownerId;
          }
        }

        dispatch({
          type: "upsert-task",
          payload: {
            ...draft,
            visibility,
            ownerId: ownerId || user?.uid,
            assigneeIds: visibility === "private" ? [] : draft.assigneeIds,
            id: makeId(),
            completed: draft.completed ?? draft.status === "done",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
      },
      updateTask: (id: string, draft: TaskDraft) => {
        const current = state.data.tasks.find((task) => task.id === id);
        if (!current) {
          return;
        }

        dispatch({
          type: "upsert-task",
          payload: {
            ...current,
            ...draft,
            id,
            ownerId: draft.visibility === "private" && user ? user.uid : current.ownerId,
            assigneeIds: draft.visibility === "private" ? [] : draft.assigneeIds || current.assigneeIds || [],
            completed: draft.completed ?? draft.status === "done",
            updatedAt: new Date().toISOString(),
          },
        });
      },
      deleteTask: (id: string) => {
        dispatch({ type: "delete-task", payload: id });
        setLastDeletedItem({ type: "tasks", id });
      },
      deleteTasks: (ids: string[]) => {
        dispatch({ type: "delete-tasks", payload: ids });
        // Don't set lastDeletedItem for bulk to avoid confusion
      },
      toggleTaskCompletion: (id: string) => dispatch({ type: "toggle-task", payload: id }),
      createProject: (draft: ProjectDraft) => {
        const timestamp = new Date().toISOString();
        const newId = makeId();
        dispatch({
          type: "upsert-project",
          payload: {
            ...draft,
            id: newId,
            assigneeIds: draft.visibility === "private" ? [] : draft.assigneeIds,
            ownerId: user?.uid,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
        if (user && currentWorkspaceId && draft.visibility !== "private") {
          logActivity({ user, workspaceId: currentWorkspaceId, action: "created", entityType: "project", entityName: draft.name });
        }
      },
      updateProject: (id: string, draft: ProjectDraft) => {
        const current = state.data.projects.find((project) => project.id === id);
        if (!current) {
          return;
        }

        dispatch({
          type: "upsert-project",
          payload: {
            ...current,
            ...draft,
            id,
            ownerId: draft.visibility === "private" && user ? user.uid : current.ownerId,
            assigneeIds: draft.visibility === "private" ? [] : draft.assigneeIds || current.assigneeIds || [],
            updatedAt: new Date().toISOString(),
          },
        });
        if (user && currentWorkspaceId && draft.visibility !== "private") {
          logActivity({ user, workspaceId: currentWorkspaceId, action: "updated", entityType: "project", entityName: draft.name });
        }
      },
      deleteProject: (id: string) => {
        const project = state.data.projects.find((p) => p.id === id);
        dispatch({ type: "delete-project", payload: id });
        setLastDeletedItem({ type: "projects", id });
        if (user && currentWorkspaceId && project && project.visibility !== "private") {
          logActivity({ user, workspaceId: currentWorkspaceId, action: "deleted", entityType: "project", entityName: project.name });
        }
      },
      deleteProjects: (ids: string[]) => {
        dispatch({ type: "delete-projects", payload: ids });
      },
      createNote: (draft: NoteDraft) => {
        const timestamp = new Date().toISOString();
        dispatch({
          type: "upsert-note",
          payload: {
            ...draft,
            id: makeId(),
            ownerId: user?.uid,
            assigneeIds: draft.visibility === "private" ? [] : draft.assigneeIds,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
        if (user && currentWorkspaceId && draft.visibility !== "private") {
          logActivity({ user, workspaceId: currentWorkspaceId, action: "created", entityType: "note", entityName: draft.title });
        }
      },
      updateNote: (id: string, draft: NoteDraft) => {
        const current = state.data.notes.find((note) => note.id === id);
        if (!current) {
          return;
        }

        dispatch({
          type: "upsert-note",
          payload: {
            ...current,
            ...draft,
            id,
            ownerId: draft.visibility === "private" && user ? user.uid : current.ownerId,
            assigneeIds: draft.visibility === "private" ? [] : draft.assigneeIds || current.assigneeIds || [],
            updatedAt: new Date().toISOString(),
          },
        });
        if (user && currentWorkspaceId && draft.visibility !== "private") {
          logActivity({ user, workspaceId: currentWorkspaceId, action: "updated", entityType: "note", entityName: draft.title });
        }
      },
      deleteNote: (id: string) => {
        const note = state.data.notes.find((n) => n.id === id);
        dispatch({ type: "delete-note", payload: id });
        setLastDeletedItem({ type: "notes", id });
        if (user && currentWorkspaceId && note && note.visibility !== "private") {
          logActivity({ user, workspaceId: currentWorkspaceId, action: "deleted", entityType: "note", entityName: note.title });
        }
      },
      deleteNotes: (ids: string[]) => {
        dispatch({ type: "delete-notes", payload: ids });
      },
      createLink: (draft: QuickLinkDraft) => {
        const timestamp = new Date().toISOString();
        dispatch({
          type: "upsert-link",
          payload: {
            ...draft,
            id: makeId(),
            ownerId: user?.uid,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
        if (user && currentWorkspaceId && draft.visibility !== "private") {
          logActivity({ user, workspaceId: currentWorkspaceId, action: "created", entityType: "link", entityName: draft.title });
        }
      },
      updateLink: (id: string, draft: QuickLinkDraft) => {
        const current = state.data.links.find((link) => link.id === id);
        if (!current) {
          return;
        }

        dispatch({
          type: "upsert-link",
          payload: {
            ...current,
            ...draft,
            id,
            ownerId: draft.visibility === "private" && user ? user.uid : current.ownerId,
            updatedAt: new Date().toISOString(),
          },
        });
        if (user && currentWorkspaceId && draft.visibility !== "private") {
          logActivity({ user, workspaceId: currentWorkspaceId, action: "updated", entityType: "link", entityName: draft.title });
        }
      },
      deleteLink: (id: string) => {
        const link = state.data.links.find((l) => l.id === id);
        dispatch({ type: "delete-link", payload: id });
        setLastDeletedItem({ type: "links", id });
        if (user && currentWorkspaceId && link && link.visibility !== "private") {
          logActivity({ user, workspaceId: currentWorkspaceId, action: "deleted", entityType: "link", entityName: link.title });
        }
      },
      deleteLinks: (ids: string[]) => {
        dispatch({ type: "delete-links", payload: ids });
      },
      restoreItem: (type: keyof WorkspaceData["trash"], id: string) => {
        dispatch({ type: "restore-item", payload: { type, id } });
      },
      permanentDeleteItem: (type: keyof WorkspaceData["trash"], id: string) => {
        dispatch({ type: "permanent-delete", payload: { type, id } });
      },
      emptyTrash: () => dispatch({ type: "empty-trash" }),
      requestAssignment: (itemId: string, itemType: "project" | "task", itemName: string, toId: string) => {
        if (!user || !currentWorkspaceId) return;

        // Prevent duplicate pending requests before dispatching
        const alreadyPending = stateDataRef.current.assignmentRequests?.some(
          (r) => r.itemId === itemId && r.toId === toId && r.status === "pending"
        );
        if (alreadyPending) return;

        const newRequest: AssignmentRequest = {
          id: makeId(),
          itemId,
          itemType,
          itemName,
          fromId: user.uid,
          fromName: user.displayName || user.email || "Unknown User",
          toId,
          status: "pending",
          timestamp: new Date().toISOString(),
        };

        // 1. Update local state immediately (optimistic)
        dispatch({ type: "send-assignment-request", payload: newRequest });

        // 2. One document per request, so sending or answering one never
        //    rewrites another member's request.
        if (itemsSchemaVersionRef.current === ITEMS_SCHEMA_VERSION) {
          pendingRequestIdsRef.current.add(newRequest.id);
          setDoc(
            doc(db, "workspaces", currentWorkspaceId, REQUESTS_COLLECTION, newRequest.id),
            sanitizeForFirestore(newRequest),
          ).catch((err) =>
            console.error("[WorkHub] Failed to write assignment request:", err),
          );
          return;
        }

        // Legacy layout: append atomically so a concurrent full-document write
        // cannot drop it.
        const wsRef = doc(db, "workspaces", currentWorkspaceId);
        updateDoc(wsRef, {
          assignmentRequests: arrayUnion(newRequest),
        }).catch((err) =>
          console.error("[WorkHub] Failed to write assignment request:", err)
        );
      },
      respondToAssignment: (requestId: string, status: "accepted" | "declined") => {
        if (!currentWorkspaceId) return;

        // 1. Update local state immediately (optimistic)
        dispatch({
          type: "respond-to-assignment-request",
          payload: { requestId, status },
        });

        // 2. Answering removes just this request's document. The assignment it
        //    grants is carried by the item document, written by the persist diff.
        if (itemsSchemaVersionRef.current === ITEMS_SCHEMA_VERSION) {
          pendingRequestIdsRef.current.add(requestId);
          deleteDoc(
            doc(db, "workspaces", currentWorkspaceId, REQUESTS_COLLECTION, requestId),
          ).catch((err) =>
            console.error("[WorkHub] Failed to remove assignment request:", err),
          );
          return;
        }

        // Legacy layout: the whole array has to be rewritten, which is why two
        // members answering different requests could lose one of them.
        const updatedRequests = (stateDataRef.current.assignmentRequests || []).filter(
          (r) => r.id !== requestId
        );
        const wsRef = doc(db, "workspaces", currentWorkspaceId);
        updateDoc(wsRef, {
          assignmentRequests: updatedRequests,
        }).catch((err) =>
          console.error("[WorkHub] Failed to update assignment requests:", err)
        );
      },
      undoLastDeletion: () => {
        if (lastDeletedItem) {
          dispatch({ type: "restore-item", payload: lastDeletedItem });
          setLastDeletedItem(null);
        }
      },
      updateSettings: (payload: WorkspaceSettings) => dispatch({ type: "update-settings", payload }),
      setTheme: (theme: ThemePreference) => {
        dispatch({
          type: "update-settings",
          payload: { ...state.data.settings, theme },
        });
      },
      replaceData: (payload: WorkspaceData) =>
        dispatch({
          type: "replace",
          payload: prepareImportedData(payload, stateDataRef.current),
        }),
      signIn: async () => {
        setAuthError(null);
        setIsAuthenticating(true);
        try {
          // Re-enable popup. Redirect often fails due to strict third-party cookie blocking in modern browsers.
          await signInWithPopup(auth, googleProvider);
          setIsAuthenticating(false);
        } catch (error: unknown) {
          const authFailure = error as { code?: string; message?: string };
          // Do NOT console.error here because Next.js 15 dev server intercepts it
          // and shows a huge error overlay, which interrupts the fallback redirect UX.
          
          if (authFailure.code === "auth/popup-blocked") {
            // Do NOT set an error string here. We want a silent fallback so the user 
            // just sees the loading spinner continue as they are seamlessly redirected.
            try {
              // Creating a fresh provider to avoid state leak
              const freshProvider = new GoogleAuthProvider();
              freshProvider.setCustomParameters({ prompt: "select_account" });
              await signInWithRedirect(auth, freshProvider);
            } catch (redirectError: unknown) {
              const failure = redirectError as { message?: string };
              setAuthError(failure.message || "Redirect failed.");
              setIsAuthenticating(false);
            }
          } else if (
            authFailure.code === "auth/popup-closed-by-user" ||
            authFailure.code === "auth/cancelled-by-user"
          ) {
            setAuthError("Sign-in cancelled or interrupted.");
            setIsAuthenticating(false);
          } else {
            console.error("Unhandled sign in error:", error);
            setAuthError(authFailure.message || "Sign in failed.");
            setIsAuthenticating(false);
          }
        }
      },
      signOut: async () => {
        try {
          await firebaseSignOut(auth);
          // Sanitization: Clear local storage and reset all in-memory state
          window.localStorage.removeItem(STORAGE_KEY);
          dispatch({ type: "replace", payload: normalizeWorkspaceData({}) });
          setRemoteDataHash(null);
          setCurrentWorkspaceId(null);
          // Hard reload the browser to clear completely the Firebase auth internal iframe cache.
          // This prevents the "popup blocked on second attempt" bug caused by state retention.
          window.location.reload();
        } catch (error: unknown) {
          const authFailure = error as { code?: string; message?: string };
          console.error("Sign out failed", error);
        }
      },
      user,
      isSyncing,
      isAuthenticating,
      authError,
      clearAuthError: () => setAuthError(null),
      currentWorkspaceId,
      workspaceLoadError,
      userRole: (state.data.members?.[user?.uid || ""]?.role as Role) || "guest",
      lastDeletedItem,
      setLastDeletedItem,
    }),
    [state.data, state.searchQuery, initialized, storageError, resolvedTheme, user, isSyncing, authError, isAuthenticating, currentWorkspaceId, workspaceLoadError, lastDeletedItem]
  );

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkHub() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkHub must be used within a WorkHubProvider");
  }
  return context;
}
