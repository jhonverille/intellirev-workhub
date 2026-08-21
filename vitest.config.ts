import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // The page-level tests drive a real component tree through many
    // user-event interactions and land within a few seconds of the 5s default,
    // so a loaded machine can tip one over and fail for no real reason.
    testTimeout: 15000,
  },
});
