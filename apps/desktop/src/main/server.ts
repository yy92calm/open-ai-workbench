import { randomUUID } from "node:crypto";
import { accessSync, cpSync, constants as fsConstants, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { app } from "electron";
import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { enrichedPath } from "./shell_env";

const TASK_TOOL_SRC = `import { tool } from "@opencode-ai/plugin";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function apiBase(context: { directory: string; worktree: string }): string | null {
  const roots = [context.worktree, context.directory];
  for (const root of roots) {
    const file = join(root, ".opencode", "task-api.json");
    if (existsSync(file)) {
      try {
        const cfg = JSON.parse(readFileSync(file, "utf-8"));
        return \`\${cfg.baseUrl}/\${cfg.token}/api/tasks\`;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function fetchApi(
  base: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const url = path ? \`\${base}/\${path}\` : base;
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
  };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, init);
  return res.json();
}

export const list_tasks = tool({
  description: "List all scheduled tasks",
  args: {},
  async execute(_args, context) {
    const base = apiBase(context);
    if (!base) return "Task API not available. Is the Workbench desktop app running?";
    return JSON.stringify(await fetchApi(base, ""), null, 2);
  },
});

export const create_task = tool({
  description: "Create a new scheduled task",
  args: {
    name: tool.schema.string().describe("Task name"),
    prompt: tool.schema.string().describe("Prompt to send to the agent on schedule"),
    cron: tool.schema.string().describe("Cron expression, e.g. '0 9 * * 1-5' for weekdays at 9am"),
  },
  async execute(args, context) {
    const base = apiBase(context);
    if (!base) return "Task API not available.";
    return JSON.stringify(
      await fetchApi(base, "", {
        method: "POST",
        body: { name: args.name, prompt: args.prompt, cron: args.cron },
      }),
      null,
      2,
    );
  },
});

export const update_task = tool({
  description: "Update an existing scheduled task. Only pass the fields you want to change.",
  args: {
    id: tool.schema.string().describe("Task ID"),
    name: tool.schema.string().optional().describe("New task name"),
    prompt: tool.schema.string().optional().describe("New prompt"),
    cron: tool.schema.string().optional().describe("New cron expression"),
    enabled: tool.schema.boolean().optional().describe("Enable or disable the task"),
  },
  async execute(args, context) {
    const base = apiBase(context);
    if (!base) return "Task API not available.";
    const { id, ...patch } = args;
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.prompt !== undefined) body.prompt = patch.prompt;
    if (patch.cron !== undefined) body.cron = patch.cron;
    if (patch.enabled !== undefined) body.enabled = patch.enabled;
    return JSON.stringify(
      await fetchApi(base, id, { method: "PUT", body }),
      null,
      2,
    );
  },
});

export const delete_task = tool({
  description: "Delete a scheduled task by ID",
  args: {
    id: tool.schema.string().describe("Task ID to delete"),
  },
  async execute(args, context) {
    const base = apiBase(context);
    if (!base) return "Task API not available.";
    return JSON.stringify(
      await fetchApi(base, args.id, { method: "DELETE" }),
      null,
      2,
    );
  },
});

export const toggle_task = tool({
  description: "Toggle a scheduled task on/off",
  args: {
    id: tool.schema.string().describe("Task ID to toggle"),
  },
  async execute(args, context) {
    const base = apiBase(context);
    if (!base) return "Task API not available.";
    return JSON.stringify(
      await fetchApi(base, \`\${args.id}/toggle\`, { method: "POST" }),
      null,
      2,
    );
  },
});

export const run_task_now = tool({
  description: "Execute a scheduled task immediately",
  args: {
    id: tool.schema.string().describe("Task ID to run immediately"),
  },
  async execute(args, context) {
    const base = apiBase(context);
    if (!base) return "Task API not available.";
    return JSON.stringify(
      await fetchApi(base, \`\${args.id}/run-now\`, { method: "POST" }),
      null,
      2,
    );
  },
});
`;

const TASK_SKILL_SRC = `---
name: scheduled-tasks
description: "定时任务管理：创建、编辑、删除、查询定时任务。当用户要求创建定时任务、管理定时任务、设置定时提醒、计划任务、安排定期执行时使用。"
---

# 定时任务管理

通过 \`scheduled-tasks_*\` 系列工具管理定时任务。这些工具由桌面应用自动注册，无需手动配置。

## 可用工具

| 工具 | 用途 |
|------|------|
| \`scheduled-tasks_list_tasks\` | 查询所有任务 |
| \`scheduled-tasks_create_task\` | 创建任务 (name, prompt, cron) |
| \`scheduled-tasks_update_task\` | 编辑任务 (id, 可选: name/prompt/cron/enabled) |
| \`scheduled-tasks_delete_task\` | 删除任务 (id) |
| \`scheduled-tasks_toggle_task\` | 启用/禁用任务 (id) |
| \`scheduled-tasks_run_task_now\` | 立即执行任务 (id) |

## 操作流程

### 创建任务
1. 确认用户需求：任务名称、提示词内容、执行频率
2. 调用 \`scheduled-tasks_create_task\` 创建

### 编辑任务
1. 调用 \`scheduled-tasks_list_tasks\` 查看当前任务
2. 确认要修改的任务和字段
3. 调用 \`scheduled-tasks_update_task\` 更新

### 删除任务
1. 调用 \`scheduled-tasks_list_tasks\` 查看当前任务
2. 确认后调用 \`scheduled-tasks_delete_task\` 删除

### 查询任务
1. 调用 \`scheduled-tasks_list_tasks\` 查看所有任务

## Cron 表达式参考

| 表达式 | 含义 |
|--------|------|
| \`0 9 * * 1-5\` | 工作日 9:00 |
| \`0 15 * * 1-5\` | 工作日 15:00 |
| \`0 8 * * *\` | 每日 8:00 |
| \`0 */2 * * *\` | 每 2 小时 |
| \`*/30 * * * *\` | 每 30 分钟 |
| \`0 9 * * 1\` | 每周一 9:00 |
| \`0 9 1 * *\` | 每月 1 号 9:00 |

格式：\`分 时 日 月 周\`

## 注意事项

- 所有操作通过 \`scheduled-tasks_*\` 工具完成
- 创建任务时 name、prompt、cron 必填
- 编辑任务时只传需要修改的字段
- 暂停任务用 \`toggle_task\`，不要删除
`;

let child: ChildProcess | null = null;
let currentUrl: string | null = null;
let currentPort: number | null = null;
let serverPassword = "";

export function getServerPassword(): string {
  if (!serverPassword) serverPassword = randomUUID();
  return serverPassword;
}

export function getServerUrl(): string | null {
  return currentUrl;
}

function runtimeRoot(): string {
  const dir = join(app.getPath("userData"), "runtime");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function xdgConfigHome(): string {
  return join(runtimeRoot(), "xdg-config");
}

function activeWorkspaceFile(): string {
  return join(runtimeRoot(), "active-workspace.txt");
}

function baseWorkspaceFile(): string {
  return join(runtimeRoot(), "base-workspace.txt");
}

export function workspaceDir(): string {
  const file = activeWorkspaceFile();
  try {
    const dir = readFileSync(file, "utf-8").trim();
    if (existsSync(dir)) return dir;
  } catch { /* fall through */ }
  return baseWorkspaceDir();
}

export function baseWorkspaceDir(): string {
  const file = baseWorkspaceFile();
  try {
    const dir = readFileSync(file, "utf-8").trim();
    if (existsSync(dir)) return dir;
  } catch { /* fall through */ }
  const docs = join(app.getPath("documents"), "Workbench");
  mkdirSync(docs, { recursive: true });
  return docs;
}

export function setActiveWorkspace(path: string): void {
  writeFileSync(activeWorkspaceFile(), path);
}

export function setBaseWorkspace(path: string): void {
  writeFileSync(baseWorkspaceFile(), path);
}

function bundledProfileSource(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "app-config");
  }
  return join(app.getAppPath(), "..", "app-config", ".opencode");
}

function sidecarBinaryPath(): string {
  const binaryName = process.platform === "win32" ? "opencode.exe" : "opencode";
  if (app.isPackaged) {
    return join(process.resourcesPath, "binaries", binaryName);
  }
  return join(app.getAppPath(), "binaries", binaryName);
}

export function deployBundledProfile(): void {
  const source = bundledProfileSource();
  const target = join(xdgConfigHome(), "opencode");
  if (!existsSync(source)) {
    log("profile", "deploy", `source not found: ${source}`, "warn");
    return;
  }
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  log("profile", "deploy", `deployed ${source} -> ${target}`);
  deployBuiltinAssets(target);
}

function deployBuiltinAssets(target: string): void {
  const toolsDir = join(target, "tools");
  mkdirSync(toolsDir, { recursive: true });
  writeFileSync(join(toolsDir, "scheduled-tasks.ts"), TASK_TOOL_SRC);

  const skillsDir = join(target, "skills", "scheduled-tasks");
  mkdirSync(skillsDir, { recursive: true });
  writeFileSync(join(skillsDir, "SKILL.md"), TASK_SKILL_SRC);
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (typeof addr !== "object" || !addr) {
        srv.close();
        reject(new Error("Failed to get port"));
        return;
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
  });
}

export async function startSidecar(): Promise<string> {
  if (child && currentUrl) return currentUrl;
  const port = currentPort ?? (await freePort());
  currentPort = port;
  const url = `http://127.0.0.1:${port}`;

  const root = runtimeRoot();
  const cfg = join(root, "xdg-config");
  const data = join(root, "xdg-data");
  const cache = join(root, "xdg-cache");
  const state = join(root, "xdg-state");
  const workspace = workspaceDir();
  for (const d of [cfg, data, cache, state]) mkdirSync(d, { recursive: true });

  deployBundledProfile();

  const password = getServerPassword();

  const env: Record<string, string> = {
    OPENCODE_SERVER_PASSWORD: password,
    XDG_CONFIG_HOME: cfg,
    XDG_DATA_HOME: data,
    XDG_CACHE_HOME: cache,
    XDG_STATE_HOME: state,
    HOME: homedir(),
    PATH: enrichedPath(),
  };

  const sidecarPath = sidecarBinaryPath();

  if (!existsSync(sidecarPath)) {
    const msg = `sidecar binary not found: ${sidecarPath}`;
    log("server", "error", msg, "error");
    throw new Error(msg);
  }

  try {
    accessSync(sidecarPath, fsConstants.X_OK);
  } catch {
    const msg = `sidecar not executable: ${sidecarPath}`;
    log("server", "error", msg, "error");
    throw new Error(msg);
  }

  const cmd = spawn(sidecarPath, ["serve", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, ...env },
    cwd: workspace,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let spawnError: Error | null = null;
  cmd.on("error", (err) => {
    spawnError = err;
    log("server", "error", `spawn failed: ${err.message}`, "error");
    child = null;
    currentUrl = null;
    currentPort = null;
  });

  cmd.stdout?.on("data", (d: Buffer) => {
    log("server", "stdout", d.toString().trim());
  });
  cmd.stderr?.on("data", (d: Buffer) => {
    log("server", "stderr", d.toString().trim(), "warn");
  });
  cmd.on("exit", (code) => {
    log("server", "sidecar exited", { code }, "warn");
    child = null;
    currentUrl = null;
    currentPort = null;
  });

  child = cmd;
  currentUrl = url;
  return url;
}

export function stopSidecar(): void {
  if (child) {
    child.kill();
    child = null;
  }
  currentUrl = null;
}

function log(
  module: string,
  stream: string,
  message: string,
  level: "info" | "warn" | "error" = "info",
): void {
  try {
    // dynamic import to avoid circular deps
    import("./logging").then(({ getLogger }) =>
      getLogger()[level](`[${module}] [${stream}] ${message}`),
    );
  } catch { /* ignore logging failures */ }
}
