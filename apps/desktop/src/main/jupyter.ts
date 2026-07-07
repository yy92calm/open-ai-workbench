import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { workspaceDir } from "./server";
import { enrichedPath } from "./shell_env";

let jupyterProc: ChildProcess | null = null;
let jupyterUrl: string | null = null;
let jupyterToken: string | null = null;
let jupyterRoot: string | null = null;

export function jupyterStatus(): { installed: boolean; running: boolean; url: string | null; token: string | null; mcpCommand: string | null } {
  const jupyterBin = join(app.getPath("userData"), "jupyter-venv", "bin", "jupyter-lab");
  const installed = existsSync(jupyterBin);
  return {
    installed,
    running: jupyterProc !== null && !jupyterProc.killed,
    url: jupyterUrl,
    token: jupyterToken,
    mcpCommand: installed ? `${jupyterBin} --notebook-dir=${workspaceDir()}` : null,
  };
}

export async function setupJupyter(): Promise<void> {
  const userData = app.getPath("userData");
  const venvDir = join(userData, "jupyter-venv");
  if (!existsSync(venvDir)) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("python3", ["-m", "venv", venvDir], {
        env: { ...process.env, PATH: enrichedPath() },
        stdio: "inherit",
      });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`venv failed: ${code}`))));
      child.on("error", reject);
    });
  }
  const pip = join(venvDir, "bin", "pip");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(pip, ["install", "jupyterlab"], {
      env: { ...process.env, PATH: enrichedPath() },
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`pip install failed: ${code}`))));
    child.on("error", reject);
  });
}

export async function startJupyter(): Promise<{ installed: boolean; running: boolean; url: string | null; token: string | null; mcpCommand: string | null }> {
  if (jupyterProc && !jupyterProc.killed) return jupyterStatus();

  const userData = app.getPath("userData");
  const jupyterBin = join(userData, "jupyter-venv", "bin", "jupyter-lab");
  if (!existsSync(jupyterBin)) return jupyterStatus();

  jupyterToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  jupyterProc = spawn(jupyterBin, [
    "--no-browser",
    "--port=0",
    "--NotebookApp.token=" + jupyterToken,
    "--notebook-dir=" + (jupyterRoot ?? workspaceDir()),
  ], {
    env: { ...process.env, PATH: enrichedPath() },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise<void>((resolve) => {
    jupyterProc!.stdout!.on("data", (d: Buffer) => {
      const text = d.toString();
      const match = text.match(/http:\/\/localhost:(\d+)\/lab\?token=/);
      if (match) {
        jupyterUrl = `http://localhost:${match[1]}`;
        resolve();
      }
    });
    setTimeout(resolve, 10000);
  });

  return jupyterStatus();
}

export function rerootJupyter(): void {
  jupyterRoot = workspaceDir();
  if (jupyterProc && !jupyterProc.killed) {
    killJupyter();
    void startJupyter();
  }
}

export function killJupyter(): void {
  if (jupyterProc) {
    jupyterProc.kill();
    jupyterProc = null;
  }
  jupyterUrl = null;
}