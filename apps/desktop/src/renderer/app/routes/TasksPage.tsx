import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Play, Plus, Trash2, Pencil, X, Power, PowerOff } from "lucide-react";
import type { TaskDef } from "@/lib/electron";
import { cn } from "@/lib/cn";

function cronToHuman(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;
  const [min, hour, , , dow] = parts;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (dow === "*") return `Daily at ${hour}:${min.padStart(2, "0")}`;
  const dowList = dow.split(",").map((d) => days[parseInt(d)]).join(", ");
  return `${dowList} at ${hour}:${min.padStart(2, "0")}`;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [editing, setEditing] = useState<TaskDef | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setTasks(await window.electronAPI.tasksList());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (task: TaskDef) => {
    await window.electronAPI.tasksUpdate(task.id, { enabled: !task.enabled });
    await load();
  };

  const remove = async (id: string) => {
    await window.electronAPI.tasksRemove(id);
    await load();
  };

  const runNow = async (id: string) => {
    await window.electronAPI.tasksRunNow(id);
    await load();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-8">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl text-text">Scheduled Tasks</h1>
          <div className="flex-1" />
          <button
            className="flex items-center gap-1.5 rounded-input bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
            onClick={() => setShowNew(true)}
          >
            <Plus size={13} /> New Task
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          Recurring agent prompts. Tasks run automatically on schedule.
        </p>

        {showNew && (
          <TaskForm
            onSave={async (name, prompt, cron) => {
              await window.electronAPI.tasksAdd(name, prompt, cron);
              setShowNew(false);
              await load();
            }}
            onCancel={() => setShowNew(false)}
          />
        )}

        {editing && (
          <TaskForm
            initial={editing}
            onSave={async (name, prompt, cron) => {
              await window.electronAPI.tasksUpdate(editing.id, { name, prompt, cron });
              setEditing(null);
              await load();
            }}
            onCancel={() => setEditing(null)}
          />
        )}

        <div className="mt-5 space-y-2">
          {tasks.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-10 text-center">
              <CalendarClock size={32} className="mx-auto mb-3 text-muted" />
              <p className="text-sm text-muted">No scheduled tasks yet.</p>
            </div>
          )}
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 rounded-card border border-border bg-surface p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      task.enabled ? "bg-ok" : "bg-muted",
                    )}
                  />
                  <span className="text-sm font-medium text-text truncate">{task.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted line-clamp-2">{task.prompt}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                  <span className="font-mono">{cronToHuman(task.cron)}</span>
                  <span>{task.cron}</span>
                  {task.lastRunAt && (
                    <span>
                      Last: {new Date(task.lastRunAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text"
                  aria-label="Run now"
                  title="Run now"
                  onClick={() => void runNow(task.id)}
                >
                  <Play size={13} />
                </button>
                <button
                  className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text"
                  aria-label={task.enabled ? "Disable" : "Enable"}
                  title={task.enabled ? "Disable" : "Enable"}
                  onClick={() => void toggle(task)}
                >
                  {task.enabled ? <PowerOff size={13} /> : <Power size={13} />}
                </button>
                <button
                  className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text"
                  aria-label="Edit"
                  onClick={() => setEditing(task)}
                >
                  <Pencil size={13} />
                </button>
                <button
                  className="rounded p-1 text-muted hover:bg-surface-2 hover:text-error"
                  aria-label="Delete"
                  onClick={() => void remove(task.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: TaskDef;
  onSave: (name: string, prompt: string, cron: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [cron, setCron] = useState(initial?.cron ?? "0 9 * * 1-5");

  const handleSave = () => {
    if (!name.trim() || !prompt.trim() || !cron.trim()) return;
    onSave(name.trim(), prompt.trim(), cron.trim());
  };

  return (
    <div className="mt-4 rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-medium text-text">
          {initial ? "Edit Task" : "New Task"}
        </h3>
        <div className="flex-1" />
        <button className="text-muted hover:text-text" onClick={onCancel}>
          <X size={14} />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-muted mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Morning brief"
            className="w-full h-9 rounded-input border border-border bg-surface px-3 text-[13px] text-text outline-none placeholder:text-muted focus:border-accent/60"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Cron</label>
            <input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 9 * * 1-5"
              className="w-full h-9 rounded-input border border-border bg-surface px-3 font-mono text-[13px] text-text outline-none placeholder:text-muted focus:border-accent/60"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs text-muted mb-1">&nbsp;</label>
            <select
              onChange={(e) => setCron(e.target.value)}
              className="w-full h-9 rounded-input border border-border bg-surface px-2 text-[13px] text-text outline-none"
            >
              <option value="">Custom</option>
              <option value="0 9 * * 1-5">Weekday 9:00</option>
              <option value="0 15 * * 1-5">Weekday 15:00</option>
              <option value="0 8 * * *">Daily 8:00</option>
              <option value="0 */2 * * *">Every 2 hours</option>
              <option value="*/30 * * * *">Every 30 min</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Summarize today's market news..."
            rows={4}
            className="w-full resize-none rounded-input border border-border bg-surface p-3 font-mono text-[13px] text-text outline-none placeholder:text-muted focus:border-accent/60"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-8 rounded-input border border-border bg-surface px-3 text-[13px] text-text hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="h-8 rounded-input bg-accent px-3 text-[13px] font-medium text-accent-fg hover:opacity-90"
          >
            {initial ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}