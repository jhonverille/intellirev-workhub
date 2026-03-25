"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";
import { TopProgressBar } from "@/components/top-progress-bar";
import { Surface } from "@/components/ui/surface";
import { useWorkHub } from "@/lib/work-hub-store";
import { RotateCcwIcon, XIcon } from "@/components/icons";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    initialized,
    storageError,
    lastDeletedItem,
    setLastDeletedItem,
    undoLastDeletion,
  } = useWorkHub();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (lastDeletedItem) {
      const timer = setTimeout(() => {
        setLastDeletedItem(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastDeletedItem, setLastDeletedItem]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
        <Surface className="w-full max-w-lg p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Loading workspace
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Getting your hub ready
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Pulling in your saved tasks, projects, notes, and links from local
            storage.
          </p>
        </Surface>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Suspense fallback={null}>
        <TopProgressBar />
      </Suspense>
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <button
              className="flex-1 bg-[rgba(15,23,42,0.28)] backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            />
            <Sidebar mobile onNavigate={() => setSidebarOpen(false)} />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            {storageError ? (
              <Surface className="mb-6 border-[color-mix(in_srgb,var(--warning)_20%,var(--line))] bg-[var(--warning-soft)] p-4">
                <p className="text-sm font-medium text-[var(--warning)]">
                  {storageError}
                </p>
              </Surface>
            ) : null}
            
            <div className="mx-auto w-full max-w-[1240px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: [0.24, 0.24, 0, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {lastDeletedItem && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 sm:bottom-10"
          >
            <div className="flex items-center gap-4 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-[var(--background)] shadow-2xl backdrop-blur-xl">
              <p className="text-sm font-medium">Deleted item moved to Trash</p>
              <div className="h-4 w-px bg-[var(--background)] opacity-20" />
              <div className="flex items-center gap-1">
                <button
                  onClick={undoLastDeletion}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold transition hover:bg-[rgba(255,255,255,0.1)]"
                >
                  <RotateCcwIcon className="h-3.5 w-3.5" />
                  Undo
                </button>
                <button
                  onClick={() => setLastDeletedItem(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-[rgba(255,255,255,0.1)]"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
