/**
 * Single definition of who may see a private workspace item.
 *
 * This is an access-control rule, so it must not be restated per page — one
 * page filtering slightly differently is a data leak. Firestore keeps private
 * items in a per-user doc; this guards the items that still travel through
 * shared state (trash, optimistic retention, assignment flows).
 */
export type VisibilityScoped = {
  visibility?: "public" | "private";
  ownerId?: string;
  assigneeIds?: string[];
};

export function canView(
  item: VisibilityScoped,
  userId: string | null | undefined,
): boolean {
  if (item.visibility !== "private") {
    return true;
  }

  if (!userId) {
    return false;
  }

  return item.ownerId === userId || (item.assigneeIds?.includes(userId) ?? false);
}

export function filterViewable<T extends VisibilityScoped>(
  items: T[],
  userId: string | null | undefined,
): T[] {
  return items.filter((item) => canView(item, userId));
}
