"use client";

import { type RefObject } from "react";
import {
  BoldIcon,
  ItalicIcon,
  Heading1Icon,
  Heading2Icon,
  ListIcon,
  ListOrderedIcon,
  CodeIcon,
  MinusIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

type ToolbarAction = {
  label: string;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  linePrefix?: string;
  block?: string;
};

const actions: ToolbarAction[] = [
  { label: "Bold", icon: <BoldIcon className="h-3.5 w-3.5" />, prefix: "**", suffix: "**" },
  { label: "Italic", icon: <ItalicIcon className="h-3.5 w-3.5" />, prefix: "*", suffix: "*" },
  { label: "Heading 1", icon: <Heading1Icon className="h-3.5 w-3.5" />, linePrefix: "# " },
  { label: "Heading 2", icon: <Heading2Icon className="h-3.5 w-3.5" />, linePrefix: "## " },
  { label: "Bullet list", icon: <ListIcon className="h-3.5 w-3.5" />, linePrefix: "- " },
  { label: "Numbered list", icon: <ListOrderedIcon className="h-3.5 w-3.5" />, linePrefix: "1. " },
  { label: "Inline code", icon: <CodeIcon className="h-3.5 w-3.5" />, prefix: "`", suffix: "`" },
  { label: "Code block", icon: <span className="font-mono text-[10px] font-bold leading-none">```</span>, block: "```\n\n```" },
  { label: "Divider", icon: <MinusIcon className="h-3.5 w-3.5" />, block: "\n---\n" },
];

type RichTextToolbarProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
};

export function RichTextToolbar({ textareaRef, value, onChange }: RichTextToolbarProps) {
  const applyAction = (action: ToolbarAction) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let newValue = value;
    let newCursorStart = start;
    let newCursorEnd = end;

    if (action.block) {
      // Insert a block snippet at cursor position
      newValue = value.slice(0, start) + action.block + value.slice(end);
      newCursorStart = start + action.block.indexOf("\n") + 1;
      newCursorEnd = newCursorStart;
    } else if (action.linePrefix) {
      // Prepend to the beginning of the current line
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLinePrefix = value.slice(lineStart, lineStart + action.linePrefix.length);
      if (currentLinePrefix === action.linePrefix) {
        // Toggle off: remove the prefix
        newValue = value.slice(0, lineStart) + value.slice(lineStart + action.linePrefix.length);
        newCursorStart = Math.max(lineStart, start - action.linePrefix.length);
        newCursorEnd = Math.max(lineStart, end - action.linePrefix.length);
      } else {
        // Toggle on: add the prefix
        newValue = value.slice(0, lineStart) + action.linePrefix + value.slice(lineStart);
        newCursorStart = start + action.linePrefix.length;
        newCursorEnd = end + action.linePrefix.length;
      }
    } else if (action.prefix && action.suffix) {
      // Wrap selected text with prefix/suffix
      if (selected.startsWith(action.prefix) && selected.endsWith(action.suffix)) {
        // Toggle off: unwrap
        const inner = selected.slice(action.prefix.length, selected.length - action.suffix.length);
        newValue = value.slice(0, start) + inner + value.slice(end);
        newCursorEnd = start + inner.length;
      } else {
        // Toggle on: wrap
        const wrapped = `${action.prefix}${selected || "text"}${action.suffix}`;
        newValue = value.slice(0, start) + wrapped + value.slice(end);
        newCursorStart = start + action.prefix.length;
        newCursorEnd = newCursorStart + (selected || "text").length;
      }
    }

    onChange(newValue);

    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCursorStart, newCursorEnd);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-1.5">
      {actions.map((action, i) => {
        const isDivider = i === 2 || i === 4 || i === 6 || i === 8;
        return (
          <div key={action.label} className="flex items-center">
            {isDivider && (
              <div className="mx-1 h-4 w-px bg-[var(--line)] opacity-60" />
            )}
            <button
              type="button"
              title={action.label}
              aria-label={action.label}
              onClick={() => applyAction(action)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition-all",
                "hover:bg-[var(--surface)] hover:text-[var(--foreground)] hover:shadow-sm",
                "active:scale-90"
              )}
            >
              {action.icon}
            </button>
          </div>
        );
      })}
    </div>
  );
}
