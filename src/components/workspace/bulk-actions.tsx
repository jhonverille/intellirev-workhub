"use client";

import { TrashIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { motion, AnimatePresence } from "framer-motion";

type BulkActionsProps = {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  noun: string;
};

export function BulkActions({
  selectedCount,
  onClear,
  onDelete,
  noun,
}: BulkActionsProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2"
        >
          <Surface className="flex items-center gap-6 px-6 py-4 shadow-2xl">
            <div className="flex items-center gap-3 border-r border-[var(--line)] pr-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--accent-foreground)]">
                {selectedCount}
              </span>
              <span className="text-sm font-medium text-[var(--foreground)]">
                {noun}{selectedCount === 1 ? "" : "s"} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="bg-[var(--danger)] hover:bg-[var(--danger-strong)] border-none"
                icon={<TrashIcon className="h-4 w-4" />}
                onClick={onDelete}
              >
                Delete {selectedCount === 1 ? "item" : "items"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<XIcon className="h-4 w-4" />}
                onClick={onClear}
              >
                Cancel
              </Button>
            </div>
          </Surface>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
