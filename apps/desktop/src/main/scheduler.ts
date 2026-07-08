import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { schedule, validate, type ScheduledTask as CronTask } from "node-cron";
import { getServerPassword, getServerUrl, workspaceDir } from "./server";

export interface TaskDef {
  id: string;
  name: string;
  prompt: string;
  cron: string;
  enabled: boolean;
  createdAt: number;
  lastRunAt?: number;
  lastSessionId?: string;
}

function tasksFile(): string {
  return join(app.getPath("userData"), "tasks.json");
}

function loadTasks(): TaskDef[] {
  try {
    if (!existsSync(tasksFile())) return [];
    const raw = readFileSync(tasksFile(), "utf-8");
    return JSON.parse(raw) as TaskDef[];
  } catch {
    return [];
  }
}

function saveTasks(tasks: TaskDef[]): void {
  writeFileSync(tasksFile(), JSON.stringify(tasks, null, 2));
}

const cronMap = new Map<string, CronTask>();

async function executeTask(task: TaskDef): Promise<void> {
  const baseUrl = getServerUrl();
  if (!baseUrl) {
    console.error(`[scheduler] task "${task.name}" skipped: no sidecar URL`);
    return;
  }
  const password = getServerPassword();
  const auth = btoa(`opencode:${password}`);
  const dir = workspaceDir();

  try {
    const res = await fetch(`${baseUrl}/session?directory=${encodeURIComponent(dir)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: "{}",
    });
    if (!res.ok) throw new Error(`create session: ${res.status}`);
    const json = (await res.json()) as { id: string };
    const sessionId = json.id;

    await fetch(`${baseUrl}/session/${encodeURIComponent(sessionId)}/prompt_async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ parts: [{ type: "text", text: task.prompt }] }),
    });

    task.lastRunAt = Date.now();
    task.lastSessionId = sessionId;
    saveTasks(loadTasks().map((t) => (t.id === task.id ? task : t)));
  } catch (err) {
    console.error(`[scheduler] task "${task.name}" failed:`, err);
  }
}

function scheduleTask(task: TaskDef): void {
  if (!validate(task.cron)) return;
  const cronTask = schedule(task.cron, () => {
    void executeTask(task);
  });
  cronMap.set(task.id, cronTask);
}

export function startScheduler(): void {
  const tasks = loadTasks();
  for (const task of tasks) {
    if (task.enabled) scheduleTask(task);
  }
}

export function stopScheduler(): void {
  for (const [, cronTask] of cronMap) {
    cronTask.stop();
  }
  cronMap.clear();
}

export function getTasks(): TaskDef[] {
  return loadTasks();
}

export function addTask(name: string, prompt: string, cron: string): TaskDef {
  const tasks = loadTasks();
  const task: TaskDef = {
    id: randomUUID(),
    name,
    prompt,
    cron,
    enabled: true,
    createdAt: Date.now(),
  };
  tasks.push(task);
  saveTasks(tasks);
  scheduleTask(task);
  return task;
}

export function updateTask(id: string, patch: Partial<Pick<TaskDef, "name" | "prompt" | "cron" | "enabled">>): TaskDef | null {
  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const old = tasks[idx];
  const updated = { ...old, ...patch };
  tasks[idx] = updated;
  saveTasks(tasks);

  const existing = cronMap.get(id);
  if (existing) {
    existing.stop();
    cronMap.delete(id);
  }
  if (updated.enabled) scheduleTask(updated);

  return updated;
}

export function removeTask(id: string): boolean {
  const tasks = loadTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveTasks(filtered);

  const existing = cronMap.get(id);
  if (existing) {
    existing.stop();
    cronMap.delete(id);
  }
  return true;
}

export function runTaskNow(id: string): TaskDef | null {
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  void executeTask(task);
  return task;
}