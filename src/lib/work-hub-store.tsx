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
} from "@/lib/types";
import { makeId } from "@/lib/utils";
import { auth, db, googleProvider } from "./firebase";
import { usePathname } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, deleteDoc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

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
  toggleTaskCompletion: (id: string) => void;
  createProject: (draft: ProjectDraft) => void;
  updateProject: (id: string, draft: ProjectDraft) => void;
  deleteProject: (id: string) => void;
  createNote: (draft: NoteDraft) => void;
  updateNote: (id: string, draft: NoteDraft) => void;
  deleteNote: (id: string) => void;
  createLink: (draft: QuickLinkDraft) => void;
  updateLink: (id: string, draft: QuickLinkDraft) => void;
  deleteLink: (id: string) => void;
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
  | { type: "toggle-task"; payload: string }
  | { type: "upsert-project"; payload: Project }
  | { type: "delete-project"; payload: string }
  | { type: "upsert-note"; payload: Note }
  | { type: "delete-note"; payload: string }
  | { type: "upsert-link"; payload: QuickLink }
  | { type: "delete-link"; payload: string }
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

    console.log("[WorkHub] Initializing Auth listener");
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[WorkHub] Auth State:", firebaseUser ? `User(${firebaseUser.uid})` : "Null");
      setUser(firebaseUser);

      // Cleanup any previous snapshot listener
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (!firebaseUser) {
        if (isMounted) {
          setCurrentWorkspaceId(null);
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

      // Deduplicate arrays by ID to prevent transient key errors during sync race conditions
      const dedupe = <T extends { id: string }>(arr1: T[], arr2: T[]) => {
        const map = new Map<string, T>();
        arr1.forEach(item => map.set(item.id, item));
        // Private items take precedence if there happens to be a conflict
        arr2.forEach(item => map.set(item.id, item));
        return Array.from(map.values());
      };

      const mergedData: WorkspaceData = {
        ...base,
        tasks: dedupe(base.tasks, priv.tasks),
        projects: dedupe(base.projects, priv.projects),
        notes: dedupe(base.notes, priv.notes),
        links: dedupe(base.links, priv.links),
      };

      const remoteHash = stableHash(mergedData);
      const localHash = stableHash(stateDataRef.current);
      
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
          tasks: baseData.tasks.filter(t => t.visibility === "private" && t.ownerId === user.uid),
          projects: baseData.projects.filter(p => p.visibility === "private" && p.ownerId === user.uid),
          notes: baseData.notes.filter(n => n.visibility === "private" && n.ownerId === user.uid),
          links: baseData.links.filter(l => l.visibility === "private" && l.ownerId === user.uid),
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
            ownerId,
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
            completed: draft.completed ?? draft.status === "done",
            updatedAt: new Date().toISOString(),
          },
        });
      },
      deleteTask: (id: string) => {
        dispatch({ type: "delete-task", payload: id });
        setLastDeletedItem({ type: "tasks", id });
      },
      toggleTaskCompletion: (id: string) => dispatch({ type: "toggle-task", payload: id }),
      createProject: (draft: ProjectDraft) => {
        const timestamp = new Date().toISOString();
        dispatch({
          type: "upsert-project",
          payload: {
            ...draft,
            id: makeId(),
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
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
            updatedAt: new Date().toISOString(),
          },
        });
      },
      deleteProject: (id: string) => {
        dispatch({ type: "delete-project", payload: id });
        setLastDeletedItem({ type: "projects", id });
      },
      createNote: (draft: NoteDraft) => {
        const timestamp = new Date().toISOString();
        dispatch({
          type: "upsert-note",
          payload: {
            ...draft,
            id: makeId(),
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
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
            updatedAt: new Date().toISOString(),
          },
        });
      },
      deleteNote: (id: string) => {
        dispatch({ type: "delete-note", payload: id });
        setLastDeletedItem({ type: "notes", id });
      },
      createLink: (draft: QuickLinkDraft) => {
        const timestamp = new Date().toISOString();
        dispatch({
          type: "upsert-link",
          payload: {
            ...draft,
            id: makeId(),
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
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
            updatedAt: new Date().toISOString(),
          },
        });
      },
      deleteLink: (id: string) => {
        dispatch({ type: "delete-link", payload: id });
        setLastDeletedItem({ type: "links", id });
      },
      restoreItem: (type, id) => {
        dispatch({ type: "restore-item", payload: { type, id } });
        if (lastDeletedItem?.id === id) setLastDeletedItem(null);
      },
      permanentDeleteItem: (type, id) => {
        dispatch({ type: "permanent-delete", payload: { type, id } });
        if (lastDeletedItem?.id === id) setLastDeletedItem(null);
      },
      emptyTrash: () => {
        dispatch({ type: "empty-trash" });
        setLastDeletedItem(null);
      },
      undoLastDeletion: () => {
        if (lastDeletedItem) {
          dispatch({ type: "restore-item", payload: lastDeletedItem });
          setLastDeletedItem(null);
        }
      },
      lastDeletedItem,
      setLastDeletedItem,
      updateSettings: (settings: WorkspaceSettings) =>
        dispatch({ type: "update-settings", payload: settings }),
      setTheme: (theme: ThemePreference) =>
        dispatch({
          type: "update-settings",
          payload: {
            ...state.data.settings,
            theme,
          },
        }),
      replaceData: (payload: WorkspaceData) => dispatch({ type: "replace", payload }),
      user,
      signIn: async () => {
        setAuthError(null);
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
          if (error.code === "auth/user-cancelled" || error.code === "auth/popup-closed-by-user") {
            // User cancelled or closed the popup. No need to log a full error or show a scary message.
            console.log("[WorkHub] Sign-in cancelled by user.");
            return;
          }
          
          console.error("Sign in failed", error);
          setAuthError(error.code || error.message || "An unknown authentication error occurred.");
        }
      },
      signOut: async () => {
        try {
          await firebaseSignOut(auth);
        } catch (error: any) {
          console.error("Sign out failed", error);
        }
      },
      isSyncing,
      authError,
      clearAuthError: () => setAuthError(null),
      currentWorkspaceId,
      workspaceLoadError,
      userRole: (() => {
        if (!user) return "assignee";
        // If ownerId matches, definitively owner
        if (state.data.ownerId === user.uid) return "owner";
        // Otherwise check members list
        const memberRole = state.data.members?.[user.uid]?.role;
        if (memberRole) return memberRole;
        // Default to owner ONLY if we don't have an ownerId yet (initial personal space)
        return !state.data.ownerId ? "owner" : "assignee";
      })(),
    }),
    [
      state.data,
      state.searchQuery,
      initialized,
      storageError,
      resolvedTheme,
      lastDeletedItem,
      setLastDeletedItem,
      user,
      isSyncing,
      authError,
      currentWorkspaceId,
      workspaceLoadError,
    ],
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
    throw new Error("useWorkHub must be used within WorkHubProvider");
  }

  return context;
}
