import { app } from "electron";
import { existsSync, readFileSync, watch, writeFileSync, type FSWatcher } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
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

function parseField(field: string, min: number, max: number): number[] {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2), 10);
      if (step > 0) {
        for (let i = min; i <= max; i += step) values.add(i);
      }
    } else if (part.includes("-")) {
      const [s, e] = part.split("-").map(Number);
      for (let i = s; i <= e; i++) values.add(i);
    } else {
      const v = parseInt(part, 10);
      if (!isNaN(v)) values.add(v);
    }
  }
  return [...values].sort((a, b) => a - b);
}

function nextCronTime(cron: string, from: Date = new Date()): Date | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const minutes = parseField(parts[0], 0, 59);
  const hours = parseField(parts[1], 0, 23);
  const days = parseField(parts[2], 1, 31);
  const months = parseField(parts[3], 1, 12);
  const dows = parseField(parts[4], 0, 6);

  if (!minutes.length || !hours.length || !days.length || !months.length || !dows.length) {
    return null;
  }

  const isAllDows = parts[4] === "*";
  const isAllDays = parts[2] === "*";

  let candidate = new Date(from);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  for (let loop = 0; loop < 366 * 24 * 60; loop++) {
    const m = candidate.getMonth() + 1;
    const d = candidate.getDate();
    const h = candidate.getHours();
    const min = candidate.getMinutes();
    const dow = candidate.getDay();

    const monthMatch = months.includes(m);
    const dayMatch = isAllDays || days.includes(d);
    const dowMatch = isAllDows || dows.includes(dow);
    const hourMatch = hours.includes(h);
    const minuteMatch = minutes.includes(min);

    if (monthMatch && hourMatch && minuteMatch && (dayMatch || dowMatch)) {
      return candidate;
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

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
  } finally {
    scheduleNext(task);
  }
}

function scheduleNext(task: TaskDef): void {
  const existing = timers.get(task.id);
  if (existing) {
    clearTimeout(existing);
    timers.delete(task.id);
  }

  if (!task.enabled) return;

  const next = nextCronTime(task.cron);
  if (!next) return;

  const delay = next.getTime() - Date.now();
  if (delay <= 0) return;

  timers.set(
    task.id,
    setTimeout(() => {
      timers.delete(task.id);
      void executeTask(task);
    }, delay),
  );
}

export function startScheduler(): void {
  const tasks = loadTasks();
  for (const task of tasks) {
    scheduleNext(task);
  }
}

export function stopScheduler(): void {
  for (const [, timer] of timers) {
    clearTimeout(timer);
  }
  timers.clear();
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
  scheduleNext(task);
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

  const existing = timers.get(id);
  if (existing) {
    clearTimeout(existing);
    timers.delete(id);
  }
  scheduleNext(updated);

  return updated;
}

export function removeTask(id: string): boolean {
  const tasks = loadTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveTasks(filtered);

  const existing = timers.get(id);
  if (existing) {
    clearTimeout(existing);
    timers.delete(id);
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

export function reloadScheduler(): void {
  stopScheduler();
  startScheduler();
}

let watcher: FSWatcher | null = null;

export function startWatching(): void {
  const file = tasksFile();
  if (watcher) return;
  try {
    watcher = watch(file, () => {
      reloadScheduler();
    });
  } catch {
    // file may not exist yet, watch will fail
  }
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}