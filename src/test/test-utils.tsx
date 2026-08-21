import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { WorkHubProvider } from "@/lib/work-hub-store";
import { defaultWorkspaceData } from "@/lib/default-data";
import type { WorkspaceData } from "@/lib/types";
import {
  ITEMS_COLLECTION,
  ITEMS_SCHEMA_VERSION,
  REQUESTS_COLLECTION,
  toStoredItems,
  type StoredItem,
} from "@/lib/workspace-items";
import {
  listDocs,
  readDoc,
  seedDoc,
  setFakeUser,
  type FakeUser,
} from "@/test/fakes/firebase-fake";

export const TEST_WORKSPACE_ID = "ws-1";

export const testUser: FakeUser = {
  uid: "user-1",
  email: "jordan@example.com",
  displayName: "Jordan Lee",
  photoURL: null,
};

export function workspaceDocPath(workspaceId = TEST_WORKSPACE_ID) {
  return `workspaces/${workspaceId}`;
}

export function itemsCollectionPath(workspaceId = TEST_WORKSPACE_ID) {
  return `${workspaceDocPath(workspaceId)}/${ITEMS_COLLECTION}`;
}

export function itemDocPath(itemId: string, workspaceId = TEST_WORKSPACE_ID) {
  return `${itemsCollectionPath(workspaceId)}/${itemId}`;
}

export function requestsCollectionPath(workspaceId = TEST_WORKSPACE_ID) {
  return `${workspaceDocPath(workspaceId)}/${REQUESTS_COLLECTION}`;
}

export function requestDocPath(requestId: string, workspaceId = TEST_WORKSPACE_ID) {
  return `${requestsCollectionPath(workspaceId)}/${requestId}`;
}

export function privateWorkspaceDocPath(
  user: FakeUser = testUser,
  workspaceId = TEST_WORKSPACE_ID,
) {
  return `private_workspaces/${workspaceId}_${user.uid}`;
}

/** The item documents currently in storage, keyed by id. */
export function readStoredItems(workspaceId = TEST_WORKSPACE_ID) {
  return listDocs(itemsCollectionPath(workspaceId)) as Map<string, StoredItem>;
}

/**
 * Real items always have an owner, and the pages filter on it ("mine or
 * assigned to me"), so fixtures need one too. Explicit owners are left alone —
 * tests use those to stand in for another member's items.
 */
function withOwner<T extends { ownerId?: string }>(items: T[], uid: string): T[] {
  return items.map((item) => (item.ownerId ? item : { ...item, ownerId: uid }));
}

function ownItems(data: WorkspaceData, uid: string): WorkspaceData {
  return {
    ...data,
    tasks: withOwner(data.tasks, uid),
    projects: withOwner(data.projects, uid),
    notes: withOwner(data.notes, uid),
    links: withOwner(data.links, uid),
    trash: {
      tasks: withOwner(data.trash.tasks, uid),
      projects: withOwner(data.trash.projects, uid),
      notes: withOwner(data.trash.notes, uid),
      links: withOwner(data.trash.links, uid),
    },
  };
}

function seedUserDoc(user: FakeUser, workspaceId: string) {
  seedDoc(`users/${user.uid}`, {
    uid: user.uid,
    email: user.email,
    currentWorkspaceId: workspaceId,
    workspaceIds: [workspaceId],
  });
}

function memberMap(user: FakeUser) {
  return {
    [user.uid]: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: "owner",
      joinedAt: new Date(0).toISOString(),
    },
  };
}

/**
 * A workspace on the current storage layout: membership and settings on the
 * workspace document, content in the `items` subcollection. Call before
 * rendering so the store's first auth callback already sees the user.
 */
export function signInWithWorkspace(
  data: Partial<WorkspaceData> = defaultWorkspaceData,
  user: FakeUser = testUser,
  workspaceId = TEST_WORKSPACE_ID,
) {
  const content: WorkspaceData = ownItems({ ...defaultWorkspaceData, ...data }, user.uid);

  seedUserDoc(user, workspaceId);
  seedDoc(workspaceDocPath(workspaceId), {
    schemaVersion: ITEMS_SCHEMA_VERSION,
    id: workspaceId,
    name: "Test Workspace",
    ownerId: user.uid,
    members: memberMap(user),
    settings: content.settings,
    // Migrated workspaces keep requests as documents, not on this document.
    assignmentRequests: [],
  });

  for (const [id, item] of toStoredItems(content)) {
    seedDoc(itemDocPath(id, workspaceId), item as unknown as Record<string, unknown>);
  }

  for (const request of content.assignmentRequests ?? []) {
    seedDoc(
      requestDocPath(request.id, workspaceId),
      request as unknown as Record<string, unknown>,
    );
  }

  setFakeUser(user);
  return { user, workspaceId };
}

/**
 * A workspace as older builds wrote it: all content in arrays on the workspace
 * document, no schemaVersion. Used to exercise the migration and the legacy
 * read path.
 */
export function signInWithLegacyWorkspace(
  data: Partial<WorkspaceData> = defaultWorkspaceData,
  user: FakeUser = testUser,
  workspaceId = TEST_WORKSPACE_ID,
) {
  const content: WorkspaceData = ownItems({ ...defaultWorkspaceData, ...data }, user.uid);

  seedUserDoc(user, workspaceId);
  seedDoc(workspaceDocPath(workspaceId), {
    ...content,
    id: workspaceId,
    name: "Test Workspace",
    ownerId: user.uid,
    members: memberMap(user),
  });

  setFakeUser(user);
  return { user, workspaceId };
}

export function renderWithProvider(ui: ReactElement) {
  return render(<WorkHubProvider>{ui}</WorkHubProvider>);
}

/** Convenience for assertions that only care about one stored item. */
export function readItem(itemId: string, workspaceId = TEST_WORKSPACE_ID) {
  return readDoc(itemDocPath(itemId, workspaceId)) as StoredItem | undefined;
}
