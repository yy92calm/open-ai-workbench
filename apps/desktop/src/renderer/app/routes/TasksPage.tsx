import { CalendarClock } from "lucide-react";

export function TasksPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-8">
        <h1 className="font-serif text-xl text-text">Scheduled Tasks</h1>
        <p className="mt-1 text-sm text-muted">
          Recurring agent tasks and reminders. Coming soon.
        </p>
        <div className="mt-6 rounded-card border border-border bg-surface p-10 text-center">
          <CalendarClock size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-sm text-muted">
            Schedule recurring prompts, data refresh, and report generation.
          </p>
        </div>
      </div>
    </div>
  );
}