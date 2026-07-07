import { Configuration } from "electron-builder";

const config: Configuration = {
  appId: "com.workbench.app",
  productName: "Workbench",
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
  ],
  mac: {
    category: "public.app-category.developer-tools",
    target: ["dmg", "zip"],
  },
  win: {
    target: ["nsis"],
  },
  linux: {
    target: ["AppImage"],
  },
};

export default config;