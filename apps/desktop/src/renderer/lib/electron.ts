import type { ElectronAPI } from "../electron";

function api(): ElectronAPI {
  if (typeof window === "undefined" || !window.electronAPI)
    throw new Error("not running in the Electron desktop app");
  return window.electronAPI;
}

export const isDesktop = true;

/** Start the bundled OpenCode sidecar (desktop only). Returns its base URL. */
export async function startRuntime(): Promise<string | null> {
  try {
    return await api().startRuntime();
  } catch {
    return null;
  }
}

export async function runtimePassword(): Promise<string | null> {
  try {
    return await api().runtimePassword();
  } catch {
    return null;
  }
}

export async function addFilesToWorkspace(): Promise<string[]> {
  try {
    return await api().addFilesToWorkspace();
  } catch {
    return [];
  }
}

export async function addTextToWorkspace(filename: string, content: string): Promise<string> {
  return api().addTextToWorkspace(filename, content);
}

export interface JupyterStatus {
  installed: boolean;
  running: boolean;
  url: string | null;
  token: string | null;
  mcp_command: string | null;
}

export async function jupyterStatus(): Promise<JupyterStatus | null> {
  try {
    return await api().jupyterStatus() as JupyterStatus | null;
  } catch {
    return null;
  }
}

export async function setupJupyter(): Promise<void> {
  await api().setupJupyter();
}

export async function startJupyter(): Promise<JupyterStatus> {
  return await api().startJupyter() as JupyterStatus;
}

export async function ensureJupyter(): Promise<void> {
  try {
    const s = await jupyterStatus();
    if (s?.installed && !s.running) await startJupyter();
  } catch {
    /* Jupyter is optional — never block the app on it */
  }
}

export async function openExternal(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;
  try {
    await api().openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export type SaveResult =
  | { kind: "saved"; path: string }
  | { kind: "canceled" }
  | { kind: "not-desktop" };

export async function saveTextFile(filename: string, content: string): Promise<SaveResult> {
  try {
    const path = await api().saveTextFile(filename, content);
    return path ? { kind: "saved", path } : { kind: "canceled" };
  } catch {
    return { kind: "not-desktop" };
  }
}

export async function workspacePath(): Promise<string | null> {
  try {
    return await api().workspacePath();
  } catch {
    return null;
  }
}

export async function workspaceBase(): Promise<string | null> {
  try {
    return await api().workspaceBase();
  } catch {
    return null;
  }
}

export async function setWorkspaceBase(path: string): Promise<string> {
  return api().setWorkspaceBase(path);
}

export async function openWorkspaceBase(): Promise<void> {
  try {
    await api().openWorkspaceBase();
  } catch { /* noop if not desktop */ }
}

export async function setWorkspace(path: string): Promise<string> {
  return api().setWorkspace(path);
}

export async function newDatedWorkspace(name: string): Promise<string> {
  return api().newDatedWorkspace(name);
}

export async function pickFolder(): Promise<string | null> {
  try {
    return await api().pickFolder();
  } catch {
    return null;
  }
}

export interface ToolStatus {
  name: string;
  found: boolean;
  version?: string | null;
}

export async function detectTools(): Promise<ToolStatus[]> {
  try {
    return await api().detectTools() as ToolStatus[];
  } catch {
    return [];
  }
}

export async function logDebug(message: string): Promise<void> {
  try {
    await api().logDebug(message);
  } catch { /* never break the app on diagnostics */ }
}
