/**
 * In-memory stand-ins for `firebase/auth` and `firebase/firestore`.
 *
 * The store (`src/lib/work-hub-store.tsx`) drives itself entirely from an auth
 * listener plus two Firestore snapshot listeners. Against the real SDK in jsdom
 * that means `onAuthStateChanged` fires `null`, the store takes its logout branch
 * and wipes state out from under the test. These fakes let a test say "this user
 * is signed in, this is what the workspace doc holds" and — importantly for the
 * public/private merge — decide the order snapshots arrive in.
 */

type DocData = Record<string, unknown>;
type SnapshotListener = (snapshot: FakeSnapshot) => void;

export type FakeSnapshot = {
  exists: () => boolean;
  data: () => DocData | undefined;
  id: string;
};

export type FakeRef = { __ref: true; path: string };

export type FakeQuerySnapshot = {
  docs: Array<{ id: string; data: () => DocData; exists: () => boolean }>;
  size: number;
  empty: boolean;
  forEach: (fn: (doc: { id: string; data: () => DocData }) => void) => void;
};

const docs = new Map<string, DocData>();
const listeners = new Map<string, Set<SnapshotListener>>();
const collectionListeners = new Map<string, Set<(snapshot: FakeQuerySnapshot) => void>>();

const heldPaths = new Set<string>();
// Writes per path. A sync bug shows up as a write count that never settles,
// which is otherwise invisible until a test runs the heap out of memory.
const writeCounts = new Map<string, number>();
const pendingInitial = new Map<string, Set<SnapshotListener>>();
let autoIdCounter = 0;

// --- test control surface ---------------------------------------------------

export function resetFirestore() {
  docs.clear();
  listeners.clear();
  collectionListeners.clear();
  pendingInitial.clear();
  heldPaths.clear();
  writeCounts.clear();
  autoIdCounter = 0;
}

export function seedDoc(path: string, data: DocData) {
  docs.set(path, checked(data) as DocData);
}

export function readDoc(path: string) {
  return docs.get(path);
}

/**
 * A write by someone else: it lands and notifies listeners, but is not counted
 * as a write by the client under test.
 */
export function simulateRemoteWrite(path: string, data: DocData) {
  docs.set(path, checked(data) as DocData);
  notify(path);
}

/** Every document directly under a collection path, keyed by document id. */
export function listDocs(collectionPath: string) {
  const prefix = collectionPath + "/";
  const result = new Map<string, DocData>();
  for (const [path, data] of docs) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (rest.includes("/")) continue;
    result.set(rest, data);
  }
  return result;
}

export function getWriteCount(path: string) {
  return writeCounts.get(path) ?? 0;
}

/**
 * Hold back the *first* snapshot for these paths so a test can choose the
 * arrival order via `emitInitialSnapshot`. Every other path delivers normally,
 * and later writes always notify immediately — matching how Firestore echoes
 * local mutations.
 */
export function holdSnapshots(paths: string[]) {
  paths.forEach((path) => heldPaths.add(path));
}

export function emitInitialSnapshot(path: string) {
  heldPaths.delete(path);
  const waiting = pendingInitial.get(path);
  if (!waiting) return;
  pendingInitial.delete(path);
  waiting.forEach((listener) => listener(snapshotFor(path)));
}

// --- firestore doubles -----------------------------------------------------

function snapshotFor(path: string): FakeSnapshot {
  const data = docs.get(path);
  return {
    exists: () => data !== undefined,
    data: () => data,
    id: path.split("/").pop() ?? path,
  };
}

/**
 * A sync loop (two listeners echoing each other, say) writes without ever
 * settling. Left alone it exhausts the heap and takes the worker down with it,
 * which reads as an infrastructure failure rather than the bug it is. Fail fast
 * with something a person can act on instead.
 */
const MAX_WRITES_PER_PATH = 200;

function recordWrite(path: string) {
  const next = (writeCounts.get(path) ?? 0) + 1;
  writeCounts.set(path, next);
  if (next > MAX_WRITES_PER_PATH) {
    throw new Error(
      `Runaway sync: ${next} writes to ${path} in one test. The store is likely ` +
        "dispatching remote state that differs from local state on every echo.",
    );
  }
}

/** Firestore paths alternate collection/document, so odd depth is a collection. */
function isCollectionPath(path: string) {
  return path.split("/").length % 2 === 1;
}

function parentCollectionOf(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

function querySnapshotFor(path: string): FakeQuerySnapshot {
  const prefix = `${path}/`;
  const docs = [...docs_entries()]
    .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes("/"))
    .map(([docPath, data]) => ({
      id: docPath.slice(prefix.length),
      data: () => data,
      exists: () => true,
    }));

  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (fn) => docs.forEach(fn),
  };
}

function docs_entries() {
  return docs.entries();
}

function notify(path: string) {
  listeners.get(path)?.forEach((listener) => listener(snapshotFor(path)));

  // A document write is also a change to the collection holding it.
  const parent = parentCollectionOf(path);
  collectionListeners
    .get(parent)
    ?.forEach((listener) => listener(querySnapshotFor(parent)));
}

/**
 * The real SDK throws on `undefined` field values unless the app opts into
 * `ignoreUndefinedProperties` (this one does not), and a rejected write takes the
 * whole sync with it. Fakes that quietly dropped undefined hid exactly that bug,
 * so reject it here too — same message shape as the SDK.
 */
function assertNoUndefined(value: unknown, path: string): void {
  if (value === undefined) {
    throw new Error(
      `Function setDoc() called with invalid data. Unsupported field value: undefined (found in field ${path})`,
    );
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUndefined(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const [key, item] of Object.entries(value)) {
      assertNoUndefined(item, path ? `${path}.${key}` : key);
    }
  }
}

function checked<T>(value: T): T {
  assertNoUndefined(value, "");
  return value;
}

const ARRAY_UNION = "__arrayUnion";

export function createFirestoreMock() {
  return {
    initializeFirestore: () => ({ __db: true }),
    getFirestore: () => ({ __db: true }),

    doc: (_db: unknown, ...segments: string[]): FakeRef => ({
      __ref: true,
      path: segments.join("/"),
    }),

    collection: (_db: unknown, ...segments: string[]): FakeRef => ({
      __ref: true,
      path: segments.join("/"),
    }),

    getDoc: async (ref: FakeRef) => snapshotFor(ref.path),

    setDoc: async (ref: FakeRef, data: DocData, options?: { merge?: boolean }) => {
      const clean = checked(data) as DocData;
      const next = options?.merge
        ? { ...(docs.get(ref.path) ?? {}), ...clean }
        : clean;
      docs.set(ref.path, next);
      recordWrite(ref.path);
      notify(ref.path);
    },

    updateDoc: async (ref: FakeRef, patch: DocData) => {
      const current = docs.get(ref.path) ?? {};
      const next = { ...current };
      for (const [key, value] of Object.entries(patch)) {
        const sentinel = value as { [ARRAY_UNION]?: unknown[] } | null;
        if (sentinel && typeof sentinel === "object" && ARRAY_UNION in sentinel) {
          const existing = Array.isArray(current[key]) ? (current[key] as unknown[]) : [];
          next[key] = [...existing, ...(sentinel[ARRAY_UNION] as unknown[])];
        } else {
          next[key] = checked(value);
        }
      }
      docs.set(ref.path, next);
      recordWrite(ref.path);
      notify(ref.path);
    },

    deleteDoc: async (ref: FakeRef) => {
      docs.delete(ref.path);
      notify(ref.path);
    },

    addDoc: async (ref: FakeRef, data: DocData) => {
      const path = `${ref.path}/auto-${++autoIdCounter}`;
      docs.set(path, checked(data) as DocData);
      notify(path);
      return { __ref: true, path } as FakeRef;
    },

    arrayUnion: (...items: unknown[]) => ({ [ARRAY_UNION]: items }),

    // The store also passes an error callback; these fakes never error, so it is
    // accepted positionally and ignored.
    onSnapshot: (ref: FakeRef, next: SnapshotListener) => {
      if (isCollectionPath(ref.path)) {
        const collectionNext = next as unknown as (snapshot: FakeQuerySnapshot) => void;
        const set =
          collectionListeners.get(ref.path) ?? new Set<(snapshot: FakeQuerySnapshot) => void>();
        set.add(collectionNext);
        collectionListeners.set(ref.path, set);

        queueMicrotask(() => {
          if (collectionListeners.get(ref.path)?.has(collectionNext)) {
            collectionNext(querySnapshotFor(ref.path));
          }
        });

        return () => {
          collectionListeners.get(ref.path)?.delete(collectionNext);
        };
      }

      const set = listeners.get(ref.path) ?? new Set<SnapshotListener>();
      set.add(next);
      listeners.set(ref.path, set);

      if (heldPaths.has(ref.path)) {
        const waiting = pendingInitial.get(ref.path) ?? new Set<SnapshotListener>();
        waiting.add(next);
        pendingInitial.set(ref.path, waiting);
      } else {
        queueMicrotask(() => {
          if (listeners.get(ref.path)?.has(next)) next(snapshotFor(ref.path));
        });
      }

      return () => {
        listeners.get(ref.path)?.delete(next);
        pendingInitial.get(ref.path)?.delete(next);
      };
    },
  };
}

// --- auth doubles ----------------------------------------------------------

export type FakeUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

let currentUser: FakeUser | null = null;
const authListeners = new Set<(user: FakeUser | null) => void>();

export function resetAuth() {
  currentUser = null;
  authListeners.clear();
}

/** Set before rendering so the store's first auth callback sees a signed-in user. */
export function setFakeUser(user: FakeUser | null) {
  currentUser = user;
  authListeners.forEach((listener) => listener(user));
}

export const fakeAuth = {
  get currentUser() {
    return currentUser;
  },
};

export function createAuthMock() {
  return {
    getAuth: () => fakeAuth,
    GoogleAuthProvider: class {
      setCustomParameters() {}
    },
    onAuthStateChanged: (
      _auth: unknown,
      callback: (user: FakeUser | null) => void,
    ) => {
      authListeners.add(callback);
      queueMicrotask(() => {
        if (authListeners.has(callback)) callback(currentUser);
      });
      return () => authListeners.delete(callback);
    },
    getRedirectResult: async () => null,
    signInWithPopup: async () => ({ user: currentUser }),
    signInWithRedirect: async () => undefined,
    signOut: async () => {
      setFakeUser(null);
    },
  };
}
