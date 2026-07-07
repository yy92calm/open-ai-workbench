import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ["electron-store", "electron-log", "electron-updater", "electron-context-menu", "electron-window-state"],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: r("./src/renderer"),
    plugins: [react()],
    resolve: {
      alias: {
        "@": r("./src/renderer"),
        "@workbench/shared": r("../../packages/shared/src/index.ts"),
        "@workbench/sdk": r("../../packages/sdk/src/index.ts"),
        "@workbench/sdk/mock-server": r("../../packages/sdk/src/mockServer.ts"),
      },
    },
    build: {
      rollupOptions: {
        input: r("./src/renderer/index.html"),
      },
    },
  },
});
