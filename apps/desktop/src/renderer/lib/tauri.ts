// Backward-compatible re-export — all imports from "./tauri" resolve to electron.ts
export { isDesktop } from "./electron";
export const isTauri = true;
export {
  startRuntime,
  runtimePassword,
  addFilesToWorkspace,
  addTextToWorkspace,
  jupyterStatus,
  setupJupyter,
  startJupyter,
  ensureJupyter,
  openExternal,
  saveTextFile,
  workspacePath,
  workspaceBase,
  setWorkspaceBase,
  openWorkspaceBase,
  setWorkspace,
  newDatedWorkspace,
  pickFolder,
  detectTools,
  logDebug,
} from "./electron";
export type { JupyterStatus, SaveResult, ToolStatus } from "./electron";