"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { Project, Task } from "@/lib/types";

type CalendarProps = {
  tasks: Task[];
  projects: Project[];
  startWeekOnMonday?: boolean;
};

export function Calendar({
  tasks,
  projects,
  startWeekOnMonday = false,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const onPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const onNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: startWeekOnMonday ? 1 : 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: startWeekOnMonday ? 1 : 0 });

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];
  if (startWeekOnMonday) {
    weekDays.push(weekDays.shift()!);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Viewing {format(currentMonth, "MMMM")} schedule
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-sm">
          <button
            onClick={onPrevMonth}
            className="rounded-xl p-2 text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
          >
            <ChevronRightIcon className="h-4 w-4 rotate-180" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:opacity-70"
          >
            Today
          </button>
          <button
            onClick={onNextMonth}
            className="rounded-xl p-2 text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--surface)] shadow-sm">
        <div className="grid grid-cols-7 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-strong)_50%,transparent)]">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-4 text-center text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));
            const dayProjects = projects.filter((p) => p.deadline && isSameDay(new Date(p.deadline), day));
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative flex min-h-[140px] flex-col gap-2 border-b border-r border-[var(--line)] p-3 transition-colors",
                  idx % 7 === 6 && "border-r-0",
                  !isCurrentMonth && "bg-[color-mix(in_srgb,var(--surface-strong)_40%,transparent)] opacity-40",
                  "hover:bg-[color-mix(in_srgb,var(--accent)_4%,transparent)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold transition",
                      isTodayDate
                        ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md"
                        : "text-[var(--foreground)]"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 overflow-hidden">
                  {dayProjects.map((project) => (
                    <div
                      key={project.id}
                      className="group relative truncate rounded-lg border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground)] shadow-sm"
                    >
                      <div className="absolute left-0 top-0 h-full w-1 bg-[var(--accent)]" />
                      {project.name}
                    </div>
                  ))}
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "truncate rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm transition hover:text-[var(--foreground)]",
                        task.completed && "line-through opacity-50"
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
