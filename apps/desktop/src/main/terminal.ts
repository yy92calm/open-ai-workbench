import { spawn, type ChildProcess } from "node:child_process";
import { platform } from "node:os";
import { BrowserWindow, ipcMain } from "electron";

interface TerminalSession {
  proc: ChildProcess | null;
  sshClient: any | null;
  sshStream: any | null;
  shellPid: number | null;
}

const sessions = new Map<string, TerminalSession>();

function getWin(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

function send(win: BrowserWindow | null, channel: string, data: unknown) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

/** Detect the default shell for the current platform. */
function defaultShell(): string {
  if (platform() === "win32") {
    // Prefer PowerShell 7 (pwsh.exe), then Windows PowerShell (powershell.exe),
    // then cmd.exe as fallback.
    const pwsh = process.env.PROGRAMFILES
      ? `${process.env.PROGRAMFILES}\\PowerShell\\7\\pwsh.exe`
      : "pwsh.exe";
    const paths = [pwsh, "powershell.exe", process.env.ComSpec || "cmd.exe"];
    for (const p of paths) {
      try {
        require("fs").accessSync(p);
        return p;
      } catch { /* try next */ }
    }
    return process.env.ComSpec || "cmd.exe";
  }
  return process.env.SHELL || "/bin/bash";
}

/** Resolve a named shell to an executable path. */
function resolveShell(name: string): string {
  if (platform() !== "win32") return name;
  switch (name) {
    case "pwsh":
    case "powershell":
      return "powershell.exe";
    case "pwsh7":
      return "pwsh.exe";
    case "cmd":
    default:
      return process.env.ComSpec || "cmd.exe";
  }
}

/** Build the spawn options for the current platform. */
function shellSpawnOptions(): Parameters<typeof spawn>[2] {
  const opts: Parameters<typeof spawn>[2] = {
    stdio: ["pipe", "pipe", "pipe"] as const,
  };

  if (platform() === "win32") {
    // Windows: no TERM, use cmd.exe defaults
    opts.env = { ...process.env };
  } else {
    // macOS/Linux: set TERM for proper terminal emulation
    opts.env = { ...process.env, TERM: "xterm-256color" };
  }

  return opts;
}

export function registerTerminalHandlers(): void {
  ipcMain.handle("terminal:create", (_e, id: string, type: "local" | "ssh", shellName?: string) => {
    const session: TerminalSession = { proc: null, sshClient: null, sshStream: null, shellPid: null };
    sessions.set(id, session);

    if (type === "local") {
      const shell = shellName ? resolveShell(shellName) : defaultShell();
      const proc = spawn(shell, [], shellSpawnOptions());
      session.proc = proc;

      proc.stdout?.on("data", (data: Buffer) => {
        const win = getWin();
        send(win, `terminal:data:${id}`, data.toString("utf-8"));
      });
      proc.stderr?.on("data", (data: Buffer) => {
        const win = getWin();
        send(win, `terminal:data:${id}`, data.toString("utf-8"));
      });
      proc.on("exit", (code) => {
        const win = getWin();
        send(win, `terminal:exit:${id}`, code);
        sessions.delete(id);
      });
      proc.on("error", (err) => {
        const win = getWin();
        send(win, `terminal:error:${id}`, err.message);
      });
    }
    return true;
  });

  ipcMain.handle("terminal:write", (_e, id: string, data: string) => {
    const session = sessions.get(id);
    if (!session) return;
    if (session.proc?.stdin?.writable) {
      session.proc.stdin.write(data);
    }
  });

  ipcMain.handle("terminal:resize", (_e, id: string, cols: number, rows: number) => {
    const session = sessions.get(id);
    if (session?.proc?.stdin?.writable) {
      session.proc.stdout?.setEncoding("utf-8");
    }
  });

  ipcMain.handle("terminal:close", (_e, id: string) => {
    const session = sessions.get(id);
    if (!session) return;
    if (session.proc) {
      // On Windows, process.kill() only works with PID, not the process group.
      // Use taskkill on Windows to ensure the shell tree is terminated.
      if (platform() === "win32" && session.proc.pid) {
        try {
          spawn("taskkill", ["/pid", String(session.proc.pid), "/f", "/t"]);
        } catch { /* ignore */ }
      }
      session.proc.kill();
    }
    sessions.delete(id);
  });
}