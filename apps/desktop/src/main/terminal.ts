import { spawn, type ChildProcess } from "node:child_process";
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

export function registerTerminalHandlers(): void {
  ipcMain.handle("terminal:create", (_e, id: string, type: "local" | "ssh") => {
    const session: TerminalSession = { proc: null, sshClient: null, sshStream: null, shellPid: null };
    sessions.set(id, session);

    if (type === "local") {
      const shell = process.env.SHELL || "/bin/bash";
      const proc = spawn(shell, [], {
        env: { ...process.env, TERM: "xterm-256color" },
        stdio: ["pipe", "pipe", "pipe"],
      });
      session.proc = proc;

      proc.stdout?.on("data", (data: Buffer) => {
        const win = getWin();
        send(win, `terminal:data:${id}`, data.toString("base64"));
      });
      proc.stderr?.on("data", (data: Buffer) => {
        const win = getWin();
        send(win, `terminal:data:${id}`, data.toString("base64"));
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
    const buf = Buffer.from(data, "base64");
    if (session.proc?.stdin?.writable) {
      session.proc.stdin.write(buf);
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
      session.proc.kill();
    }
    sessions.delete(id);
  });
}