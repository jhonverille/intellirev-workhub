import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import {
  createAuthMock,
  createFirestoreMock,
  resetAuth,
  resetFirestore,
} from "@/test/fakes/firebase-fake";

// The store talks to Firebase on mount. Swap the SDK for in-memory doubles so
// tests control auth state and snapshot ordering instead of racing the real
// listeners (which fire `null` in jsdom and make the store wipe local state).
vi.mock("firebase/auth", () => createAuthMock());
vi.mock("firebase/firestore", () => createFirestoreMock());

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, "crypto", {
      value: {
        randomUUID: () => "test-id",
      },
    });
  }
});

afterEach(() => {
  cleanup();
  resetAuth();
  resetFirestore();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
});
