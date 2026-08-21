import { canView, filterViewable } from "@/lib/visibility";

const uid = "user-1";

describe("canView", () => {
  it("allows any user to see items that are not private", () => {
    expect(canView({}, uid)).toBe(true);
    expect(canView({ visibility: "public" }, uid)).toBe(true);
    expect(canView({ visibility: "public" }, null)).toBe(true);
  });

  it("allows the owner and assignees to see a private item", () => {
    expect(canView({ visibility: "private", ownerId: uid }, uid)).toBe(true);
    expect(
      canView({ visibility: "private", ownerId: "user-2", assigneeIds: [uid] }, uid),
    ).toBe(true);
  });

  it("hides a private item from other members", () => {
    expect(
      canView({ visibility: "private", ownerId: "user-2", assigneeIds: ["user-3"] }, uid),
    ).toBe(false);
    expect(canView({ visibility: "private", ownerId: "user-2" }, uid)).toBe(false);
  });

  it("hides private items when there is no signed-in user", () => {
    // The previous inline predicate compared `item.ownerId === user?.uid`, so an
    // owner-less private item was visible to everyone while signed out.
    expect(canView({ visibility: "private" }, null)).toBe(false);
    expect(canView({ visibility: "private" }, undefined)).toBe(false);
  });

  it("filters collections with the same rule", () => {
    const items = [
      { id: "a" },
      { id: "b", visibility: "private" as const, ownerId: uid },
      { id: "c", visibility: "private" as const, ownerId: "user-2" },
      { id: "d", visibility: "private" as const, ownerId: "user-2", assigneeIds: [uid] },
    ];

    expect(filterViewable(items, uid).map((item) => item.id)).toEqual(["a", "b", "d"]);
  });
});
