import { Configuration } from "electron-builder";

const config: Configuration = {
  appId: "com.workbench.app",
  productName: "Workbench",
  publish: [],
  directories: {
    output: "release",
  },
  extraResources: [
    {
      from: "binaries",
      to: "binaries",
      filter: ["opencode", "opencode.exe"],
    },
    {
      from: "../../app-config/.opencode",
      to: "app-config",
    },
    {
      from: "scripts",
      to: "scripts",
      filter: ["mcp_scheduler.mjs"],
    },
  ],
  mac: {
    category: "public.app-category.developer-tools",
    target: ["dmg", "zip"],
    icon: "build-resources/icon.icns",
  },
  win: {
    target: ["nsis"],
    icon: "build-resources/icon.png",
  },
  linux: {
    target: ["AppImage"],
    icon: "build-resources/icon.png",
  },
};

export default config;