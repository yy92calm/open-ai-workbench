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

export interface ElectronAPI {
  channelName: () => Promise<string>;
  appIdentifier: () => Promise<string>;

  startRuntime: () => Promise<string>;
  runtimePassword: () => Promise<string>;
  stopRuntime: () => Promise<void>;
  serverUrl: () => Promise<string | null>;

  workspacePath: () => Promise<string>;
  workspaceBase: () => Promise<string>;
  setWorkspaceBase: (path: string) => Promise<string>;
  setWorkspace: (path: string) => Promise<string>;
  newDatedWorkspace: (name: string) => Promise<string>;
  openWorkspaceBase: () => Promise<void>;
  pickFolder: () => Promise<string | null>;

  readArtifact: (rel: string, root?: string) => Promise<{ content: string; binary: boolean } | null>;
  openPath: (rel: string, root?: string) => Promise<void>;
  resolveArtifact: (rel: string) => Promise<string | null>;
  saveTextFile: (filename: string, content: string) => Promise<string | null>;
  openUrl: (url: string) => Promise<void>;
  addFilesToWorkspace: () => Promise<string[]>;
  addTextToWorkspace: (filename: string, content: string) => Promise<string>;
  listNotebooks: (root?: string) => Promise<{ name: string; path: string; modified: string }[]>;
  listDir: (rel: string, root?: string) => Promise<{ name: string; is_dir: boolean; is_file: boolean; size: number }[]>;
  writeWorkspaceFile: (rel: string, content: string, root?: string) => Promise<void>;

  kernelExecute: (code: string, language: string, notebook?: string) => Promise<{ stdout: string; stderr: string; exitCode: number | null }>;
  kernelReset: (language: string, notebook?: string) => Promise<void>;

  recordProvenance: (sessionId: string, callId: string, tool: string, input: unknown, output: unknown, model: string | null) => Promise<void>;
  listProvenance: (path: string) => Promise<unknown[]>;
  readEnvLockfile: (hash: string) => Promise<string>;

  previewUrl: (rel: string, root?: string) => Promise<string | null>;

  detectTools: () => Promise<{ name: string; found: boolean; version: string | null }[]>;

  shellPath: () => Promise<string>;
  shellInfo: () => Promise<{ path: string; name: string; isDefault: boolean }[]>;

  storeGet: (key: string, scope?: string) => Promise<unknown>;
  storeSet: (key: string, value: unknown, scope?: string) => Promise<void>;
  storeDelete: (key: string, scope?: string) => Promise<void>;
  storeClear: (scope?: string) => Promise<void>;
  storeKeys: (scope?: string) => Promise<string[]>;
  storeLength: (scope?: string) => Promise<number>;

  logDebug: (message: string) => Promise<void>;
  logEvent: (level: string, module: string, message: string, data?: unknown) => Promise<void>;
  exportLogs: () => Promise<string>;

  checkForUpdates: (alertOnUpToDate?: boolean) => Promise<void>;

  openExternal: (url: string) => Promise<void>;

  tasksList: () => Promise<TaskDef[]>;
  tasksAdd: (name: string, prompt: string, cron: string) => Promise<TaskDef>;
  tasksUpdate: (id: string, patch: Record<string, unknown>) => Promise<TaskDef | null>;
  tasksRemove: (id: string) => Promise<boolean>;
  tasksRunNow: (id: string) => Promise<TaskDef | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
