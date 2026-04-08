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
      const item = (state.data.trash[type] as any[]).find((i) => i.id === id);
      if (!item) return state;

      return {
        ...state,
        data: {
          ...state.data,
          [type]: [item, ...(state.data[type] as any[])],
          trash: {
            ...state.data.trash,
            [type]: (state.data.trash[type] as any[]).filter((i) => i.id !== id),
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
            [type]: (state.data.trash[type] as any[]).filter((i) => i.id !== id),
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
    .map((k) => `${JSON.stringify(k)}:${stableHash((value as any)[k])}`);
  return `{${sorted.join(",")}}`;
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
      } catch (err: any) {
        console.error("[WorkHub] User doc check/create error:", err);
        if (isMounted) {
          setWorkspaceLoadError(err.message || "Failed to connect to user profile.");
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
            await setDoc(doc(db, "workspaces", newWsId), {
              ...state.data,
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
            });
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

  const stateDataRef = useRef(state.data);
  useEffect(() => {
    stateDataRef.current = state.data;
  }, [state.data]);

  // 3. Workspace Sync (Remote -> Local)
  useEffect(() => {
    if (!user || !initialized || !currentWorkspaceId) {
      if (initialized && !currentWorkspaceId) setIsSyncing(false);
      return;
    }

    const wsDocRef = doc(db, "workspaces", currentWorkspaceId);
    const privateWsRef = doc(db, "private_workspaces", `${currentWorkspaceId}_${user.uid}`);
    console.log("[WorkHub] Syncing workspace:", currentWorkspaceId);
    setIsSyncing(true);

    let lastPublicData: WorkspaceData | null = null;
    let lastPrivateData: WorkspaceData | null = null;

    const mergeAndDispatch = () => {
      if (!lastPublicData && !lastPrivateData) return;
      
      const base = lastPublicData || normalizeWorkspaceData({});
      const priv = lastPrivateData || normalizeWorkspaceData({});
      const current = stateDataRef.current;

      // Deduplicate arrays by ID to prevent transient key errors during sync race conditions
      const dedupe = <T extends { id: string }>(remoteArr1: T[], remoteArr2: T[], localActive: T[], localTrash: T[]) => {
        const map = new Map<string, T>();
        
        // 1. Remote items (Cloud)
        remoteArr1.forEach(item => map.set(item.id, item));
        remoteArr2.forEach(item => map.set(item.id, item));

        // 2. OPTIMISTIC RETENTION: If an item exists in local state but not in remote yet,
        // it means a local change occurred and we are waiting for the echo from Firestore.
        localActive.forEach(localItem => {
          if (!map.has(localItem.id)) {
            map.set(localItem.id, localItem);
          }
        });

        // 3. GHOSTING PREVENTION: If it's in our local trash, remove it from the active list.
        // This prevents deleted items from "reappearing" during sync.
        localTrash.forEach(trashItem => {
          map.delete(trashItem.id);
        });

        return Array.from(map.values());
      };

      const mergedData: WorkspaceData = {
        ...base,
        tasks: dedupe(base.tasks, priv.tasks, current.tasks, current.trash.tasks),
        projects: dedupe(base.projects, priv.projects, current.projects, current.trash.projects),
        notes: dedupe(base.notes, priv.notes, current.notes, current.trash.notes),
        links: dedupe(base.links, priv.links, current.links, current.trash.links),
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

    const unsubPrivate = onSnapshot(privateWsRef, (snapshot) => {
      if (snapshot.exists()) {
        lastPrivateData = normalizeWorkspaceData(snapshot.data());
      } else {
        lastPrivateData = normalizeWorkspaceData({});
      }
      mergeAndDispatch();
    }, (err) => {
      console.error("[WorkHub] Private workspace sync error:", err);
    });

    return () => {
      unsubPublic();
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
      setStorageError(null);

      // Only push to Firestore if data changed locally (not from remote)
      if (user && currentWorkspaceId && stableHash(state.data) !== remoteDataHash) {
        setIsSyncing(true);
        
        const baseData = state.data;
        
        const publicData: WorkspaceData = {
          ...baseData,
          tasks: baseData.tasks.filter(t => t.visibility !== "private"),
          projects: baseData.projects.filter(p => p.visibility !== "private"),
          notes: baseData.notes.filter(n => n.visibility !== "private"),
          links: baseData.links.filter(l => l.visibility !== "private"),
        };

        const privateData: WorkspaceData = {
          ...baseData,
          members: {}, // Skip member array in private
          tasks: baseData.tasks.filter(t => t.visibility === "private"),
          projects: baseData.projects.filter(p => p.visibility === "private"),
          notes: baseData.notes.filter(n => n.visibility === "private"),
          links: baseData.links.filter(l => l.visibility === "private"),
        };

        const publicProm = setDoc(doc(db, "workspaces", currentWorkspaceId), publicData, { merge: true });
        const privateProm = setDoc(doc(db, "private_workspaces", `${currentWorkspaceId}_${user.uid}`), privateData, { merge: true });
        
        Promise.all([publicProm, privateProm]).finally(() => setIsSyncing(false));
      }
    } catch {
      setStorageError(
        "Work Hub could not save your latest changes. Your current session still works, but changes may not persist.",
      );
    }
  }, [initialized, state.data, user, remoteDataHash, currentWorkspaceId]);

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
      replaceData: (payload: WorkspaceData) => dispatch({ type: "replace", payload }),
      signIn: async () => {
        setAuthError(null);
        setIsAuthenticating(true);
        try {
          // Re-enable popup. Redirect often fails due to strict third-party cookie blocking in modern browsers.
          await signInWithPopup(auth, googleProvider);
          setIsAuthenticating(false);
        } catch (error: any) {
          // Do NOT console.error here because Next.js 15 dev server intercepts it
          // and shows a huge error overlay, which interrupts the fallback redirect UX.
          
          if (error.code === "auth/popup-blocked") {
            // Do NOT set an error string here. We want a silent fallback so the user 
            // just sees the loading spinner continue as they are seamlessly redirected.
            try {
              // Creating a fresh provider to avoid state leak
              const freshProvider = new GoogleAuthProvider();
              freshProvider.setCustomParameters({ prompt: "select_account" });
              await signInWithRedirect(auth, freshProvider);
            } catch (redirectError: any) {
              setAuthError(redirectError.message || "Redirect failed.");
              setIsAuthenticating(false);
            }
          } else if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-by-user") {
            setAuthError("Sign-in cancelled or interrupted.");
            setIsAuthenticating(false);
          } else {
            console.error("Unhandled sign in error:", error);
            setAuthError(error.message || "Sign in failed.");
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
        } catch (error: any) {
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
