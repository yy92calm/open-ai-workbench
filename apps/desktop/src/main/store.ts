import Store from "electron-store";
import { app } from "electron";

const cache = new Map<string, Store>();

export function getStore(name = "workbench.settings"): Store {
  const cached = cache.get(name);
  if (cached) return cached;
  const next = new Store({
    name,
    cwd: app.getPath("userData"),
    fileExtension: "json",
    accessPropertiesByDotNotation: false,
  });
  cache.set(name, next);
  return next;
}

export function removeStoreFile(name: string): void {
  cache.delete(name);
}
