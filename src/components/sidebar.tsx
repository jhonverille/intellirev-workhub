"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  CheckSquareIcon,
  DashboardIcon,
  FolderIcon,
  LinkIcon,
  NoteIcon,
  SettingsIcon,
  TrashIcon,
  UserIcon,
} from "@/components/icons";
import { appNavigation } from "@/lib/navigation";
import { useWorkHub } from "@/lib/work-hub-store";
import { cn } from "@/lib/utils";

const iconMap = {
  dashboard: DashboardIcon,
  projects: FolderIcon,
  calendar: CalendarIcon,
  tasks: CheckSquareIcon,
  notes: NoteIcon,
  links: LinkIcon,
  team: UserIcon,
  trash: TrashIcon,
  settings: SettingsIcon,
} as const;

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { data, userRole } = useWorkHub();

  const filteredNavigation = appNavigation;

  return (
    <aside
      className={cn(
        "flex h-full flex-col",
        mobile
          ? "w-full max-w-xs rounded-r-[32px] border-r border-[var(--line)] bg-[var(--surface)] p-5 shadow-xl"
          : "w-72 border-r border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_78%,white)] p-5",
      )}
    >
      <Link href="/" className="flex items-center gap-3 rounded-3xl px-2 py-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-transparent text-[var(--accent-foreground)]">
          <Image src="/logo.png" alt="Work Hub Logo" width={64} height={64} className="max-h-full max-w-full object-contain" />
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-tight text-[var(--foreground)]">
            {data.name || "Work Hub"}
          </span>
          <span className="block text-sm text-[var(--muted)]">
            {data.name ? "Workspace" : "Personal operating space"}
          </span>
        </span>
      </Link>

      <nav className="mt-10 flex flex-1 flex-col gap-2.5">
        {filteredNavigation.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "text-[var(--background)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 z-0 rounded-[20px] bg-[var(--foreground)] shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              
              <Icon className={cn(
                "relative z-10 h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                active && "text-[var(--background)]"
              )} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-strong)_85%,white),var(--surface-strong))] p-5">
        <p className="text-sm font-semibold tracking-[-0.01em] text-[var(--foreground)]">
          Keep it simple
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          Focused systems work best when the next step is obvious and close at hand.
        </p>
      </div>
    </aside>
  );
}
