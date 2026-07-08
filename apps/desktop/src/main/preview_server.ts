import { createServer, type Server, IncomingMessage, ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { baseWorkspaceDir, workspaceDir } from "./server";
import {
  getTasks,
  addTask,
  updateTask,
  removeTask,
  runTaskNow,
} from "./scheduler";

let server: Server | null = null;
let serverToken: string | null = null;
let serverPort: number | null = null;

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".ipynb": "application/json",
  ".py": "text/x-python",
  ".r": "text/x-r",
  ".xml": "application/xml",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

export function previewToken(): string {
  if (!serverToken) serverToken = randomBytes(24).toString("hex");
  return serverToken;
}

export function previewUrl(rel: string, root?: string): string | null {
  const base = root === "workspace" ? workspaceDir() : baseWorkspaceDir();
  const file = resolve(base, rel);
  if (!file.startsWith(baseWorkspaceDir()) || !existsSync(file)) return null;
  return `http://127.0.0.1:${serverPort ?? 0}/${previewToken()}/w/${encodeURIComponent(rel)}`;
}

function taskApiUrl(): string {
  return `http://127.0.0.1:${serverPort ?? 0}/${previewToken()}/api/tasks`;
}

function writeDiscoveryFile(): void {
  try {
    const ws = workspaceDir();
    const dir = join(ws, ".opencode");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "task-api.json"),
      JSON.stringify({ baseUrl: `http://127.0.0.1:${serverPort ?? 0}`, token: previewToken() }),
    );
  } catch { /* best-effort */ }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
  });
}

function jsonReply(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function taskApiBaseUrl(): string | null {
  if (!serverPort) return null;
  return `http://127.0.0.1:${serverPort}/${previewToken()}/api/tasks`;
}

export function startPreviewServer(): number {
  if (server) return serverPort!;

  server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length < 1) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const token = parts[0];

    // file serving
    if (token === serverToken && parts.length >= 2 && parts[1] === "w") {
      const rel = decodeURIComponent(parts.slice(2).join("/"));
      const base = baseWorkspaceDir();
      const file = resolve(base, rel);
      if (!file.startsWith(base) || !existsSync(file)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const ext = extname(file).toLowerCase();
      const mime = MIME[ext] ?? "application/octet-stream";
      const content = readFileSync(file);
      res.writeHead(200, { "Content-Type": mime, "Content-Length": String(content.length) });
      res.end(content);
      return;
    }

    // task API
    if (token === serverToken && parts[1] === "api" && parts[2] === "tasks") {
      const taskId = parts[3];
      const subAction = parts[4];

      try {
        // GET /api/tasks
        if (req.method === "GET" && !taskId) {
          jsonReply(res, getTasks());
          return;
        }

        // POST /api/tasks
        if (req.method === "POST" && !taskId) {
          const body = await readBody(req);
          const { name, prompt, cron } = JSON.parse(body);
          if (!name || !prompt || !cron) {
            jsonReply(res, { error: "name, prompt, cron are required" }, 400);
            return;
          }
          const task = addTask(name, prompt, cron);
          jsonReply(res, task, 201);
          return;
        }

        // PUT /api/tasks/:id
        if (req.method === "PUT" && taskId && !subAction) {
          const body = await readBody(req);
          const patch = JSON.parse(body);
          const updated = updateTask(taskId, patch);
          if (!updated) {
            jsonReply(res, { error: "not found" }, 404);
            return;
          }
          jsonReply(res, updated);
          return;
        }

        // DELETE /api/tasks/:id
        if (req.method === "DELETE" && taskId && !subAction) {
          const ok = removeTask(taskId);
          if (!ok) {
            jsonReply(res, { error: "not found" }, 404);
            return;
          }
          jsonReply(res, { deleted: taskId });
          return;
        }

        // POST /api/tasks/:id/toggle
        if (req.method === "POST" && taskId && subAction === "toggle") {
          const tasks = getTasks();
          const task = tasks.find((t) => t.id === taskId);
          if (!task) {
            jsonReply(res, { error: "not found" }, 404);
            return;
          }
          const updated = updateTask(taskId, { enabled: !task.enabled });
          jsonReply(res, updated);
          return;
        }

        // POST /api/tasks/:id/run-now
        if (req.method === "POST" && taskId && subAction === "run-now") {
          const task = runTaskNow(taskId);
          if (!task) {
            jsonReply(res, { error: "not found" }, 404);
            return;
          }
          jsonReply(res, { status: "executing", id: taskId });
          return;
        }
      } catch (err) {
        jsonReply(res, { error: String(err) }, 500);
        return;
      }
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(0, "127.0.0.1", () => {
    const addr = server!.address();
    if (typeof addr === "object" && addr) serverPort = addr.port;
    writeDiscoveryFile();
  });

  return serverPort ?? 0;
}

export function stopPreviewServer(): void {
  if (server) {
    server.close();
    server = null;
  }
  serverPort = null;
}