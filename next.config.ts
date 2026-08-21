import path from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  turbopack: {
    // There is a stray package-lock.json in the user profile directory, and
    // without this Next picks that directory as the workspace root. Scripts
    // always run from the project root, so cwd is the right answer.
    root: path.resolve(),
  },
  images: {
    unoptimized: true,
  },
  ...(isDev
    ? {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                {
                  key: "Cross-Origin-Opener-Policy",
                  value: "unsafe-none",
                },
              ],
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
