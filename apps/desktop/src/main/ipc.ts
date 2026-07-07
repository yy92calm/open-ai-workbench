import { ipcMain, dialog, BrowserWindow } from "electron";
import { CHANNEL, APP_NAMES, APP_IDS } from "./constants";
import { getStore, removeStoreFile } from "./store";
import { getLogger, exportDebugLogs } from "./logging";
import { startSidecar, stopSidecar, getServerPassword, workspaceDir, baseWorkspaceDir, setActiveWorkspace, setBaseWorkspace, getServerUrl } from "./server";
import * as artifactFile from "./artifact_file";
import * as kernel from "./kernel";
import * as provenance from "./provenance";
import { startPreviewServer, stopPreviewServer, previewToken, previewUrl } from "./preview_server";
import { detectShells, detectTools, enrichedPath } from "./shell_env";
import { checkForUpdates } from "./updater";
import { createMainWindow, getMainWindow } from "./windows";

export function registerIpcHandlers(): void {
  const log = getLogger();

  // ---- Channel ----
  ipcMain.handle("channel-name", () => CHANNEL);
  ipcMain.handle("app-identifier", () => APP_IDS[CHANNEL]);

  // ---- Runtime (sidecar) ----
  ipcMain.handle("start-runtime", async () => {
    const url = await startSidecar();
    return url;
  });
  ipcMain.handle("runtime-password", () => getServerPassword());
  ipcMain.handle("stop-runtime", () => stopSidecar());
  ipcMain.handle("server-url", () => getServerUrl());

  // ---- Workspace ----
  ipcMain.handle("workspace-path", () => workspaceDir());
  ipcMain.handle("workspace-base", () => baseWorkspaceDir());
  ipcMain.handle("set-workspace-base", (_e, path: string) => {
    setBaseWorkspace(path);
    return baseWorkspaceDir();
  });
  ipcMain.handle("set-workspace", (_e, path: string) => {
    setActiveWorkspace(path);
    return workspaceDir();
  });
  ipcMain.handle("new-dated-workspace", (_e, name: string) => {
    if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
      throw new Error("invalid folder name");
    }
    const dir = require("node:path").join(baseWorkspaceDir(), name);
    setActiveWorkspace(dir);
    return dir;
  });
  ipcMain.handle("open-workspace-base", () => {
    const { shell } = require("electron");
    shell.openPath(baseWorkspaceDir());
  });
  ipcMain.handle("pick-folder", async () => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // ---- Artifact / File ----
  ipcMain.handle("read-artifact", (_e, path: string, root?: string) => artifactFile.readArtifact(path, root));
  ipcMain.handle("open-path", (_e, rel: string, root?: string) => artifactFile.openPath(rel, root));
  ipcMain.handle("resolve-artifact", (_e, rel: string, root?: string) => artifactFile.resolveArtifact(rel, root));
  ipcMain.handle("save-text-file", (_e, filename: string, content: string) => artifactFile.saveTextFile(filename, content));
  ipcMain.handle("open-url", (_e, url: string) => artifactFile.openUrl(url));
  ipcMain.handle("add-files-to-workspace", async () => {
    const win = getMainWindow();
    if (!win) return [];
    const result = await dialog.showOpenDialog(win, { properties: ["openFile", "multiSelections"] });
    if (result.canceled || result.filePaths.length === 0) return [];
    const names: string[] = [];
    for (const fp of result.filePaths) {
      const fs = await import("node:fs");
      const content = fs.readFileSync(fp, "utf-8");
      const name = require("node:path").basename(fp);
      artifactFile.addTextToWorkspace(name, content);
      names.push(name);
    }
    return names;
  });
  ipcMain.handle("add-text-to-workspace", (_e, filename: string, content: string) =>
    artifactFile.addTextToWorkspace(filename, content));
  ipcMain.handle("list-notebooks", (_e, root?: string) => artifactFile.listNotebooks(root));
  ipcMain.handle("list-dir", (_e, rel: string, root?: string) => artifactFile.listDir(rel, root));
  ipcMain.handle("write-workspace-file", (_e, rel: string, content: string, root?: string) =>
    artifactFile.writeWorkspaceFile(rel, content, root));
  ipcMain.handle("rename-workspace-file", (_e, oldRel: string, newRel: string, root?: string) =>
    artifactFile.renameWorkspaceFile(oldRel, newRel, root));
  ipcMain.handle("delete-workspace-file", (_e, rel: string, root?: string) =>
    artifactFile.deleteWorkspaceFile(rel, root));
  ipcMain.handle("search-workspace", (_e, query: string, root?: string) =>
    artifactFile.searchWorkspace(query, root));

  // ---- Kernel ----
  ipcMain.handle("kernel-execute", (_e, code: string, language: string, notebook?: string) =>
    kernel.kernelExecute(code, language, notebook));
  ipcMain.handle("kernel-reset", (_e, language: string, notebook?: string) =>
    kernel.kernelReset(language, notebook));

  // ---- Provenance ----
  ipcMain.handle("record-provenance", (_e, sessionId: string, callId: string, tool: string, input: unknown, output: unknown, model: string | null) =>
    provenance.recordProvenance(sessionId, callId, tool, input, output, model));
  ipcMain.handle("list-provenance", (_e, path: string) => provenance.listProvenance(path));
  ipcMain.handle("read-env-lockfile", (_e, hash: string) => provenance.readEnvLockfile(hash));

  // ---- Preview ----
  ipcMain.handle("preview-url", (_e, rel: string, root?: string) => previewUrl(rel, root));

  // ---- Tools ----
  ipcMain.handle("detect-tools", async () => {
    const tools = await detectTools();
    return tools.map((t) => ({
      name: t.name,
      found: t.path !== null,
      version: t.version,
    }));
  });

  // ---- Shell ----
  ipcMain.handle("shell-path", () => enrichedPath());
  ipcMain.handle("shell-info", () => detectShells());

  // ---- Store ----
  ipcMain.handle("store-get", (_e, key: string, scope?: string) => {
    const store = getStore(scope);
    return store.get(key);
  });
  ipcMain.handle("store-set", (_e, key: string, value: unknown, scope?: string) => {
    const store = getStore(scope);
    store.set(key, value);
  });
  ipcMain.handle("store-delete", (_e, key: string, scope?: string) => {
    const store = getStore(scope);
    store.delete(key);
  });
  ipcMain.handle("store-clear", (_e, scope?: string) => {
    const store = getStore(scope);
    store.clear();
  });
  ipcMain.handle("store-keys", (_e, scope?: string) => {
    const store = getStore(scope);
    return Object.keys(store.store);
  });
  ipcMain.handle("store-length", (_e, scope?: string) => {
    const store = getStore(scope);
    return Object.keys(store.store).length;
  });

  // ---- Logging ----
  ipcMain.handle("log-debug", (_e, message: string) => {
    log.info(`[renderer] ${message}`);
  });
  ipcMain.handle("log-event", (_e, level: string, module: string, message: string, data?: unknown) => {
    const lvl = level.toLowerCase() === "warn" ? "warn"
      : level.toLowerCase() === "error" ? "error"
      : level.toLowerCase() === "debug" ? "debug"
      : "info";
    const meta = data ? ` ${JSON.stringify(data)}` : "";
    log[lvl](`[${module}] ${message}${meta}`);
  });
  ipcMain.handle("export-logs", async () => exportDebugLogs());

  // ---- Updater ----
  ipcMain.handle("check-for-updates", async (_e, alertOnUpToDate: boolean) => {
    await checkForUpdates(alertOnUpToDate);
  });

  log.info("IPC handlers registered");
}
