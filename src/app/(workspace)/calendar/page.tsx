"use client";

import { SectionHeader } from "@/components/ui/section-header";
import { Calendar } from "@/components/ui/calendar";
import { useWorkHub } from "@/lib/work-hub-store";

export default function CalendarPage() {
  const { data } = useWorkHub();

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Timeline"
        title="Schedule your success"
        description="A bird's-eye view of your upcoming deadlines and tasks. Hover over a day to see your planned momentum."
      />

      <Calendar 
        tasks={data.tasks} 
        projects={data.projects} 
        startWeekOnMonday={data.settings.preferences.startWeekOnMonday}
      />
    </div>
  );
}
