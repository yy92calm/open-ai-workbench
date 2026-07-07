import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export function enrichedPath(): string {
  const base = process.env.PATH ?? "";
  const home = process.env.HOME ?? "";
  const extras = [
    `${home}/anaconda3/bin`,
    `${home}/miniconda3/bin`,
    "/opt/anaconda3/bin",
    "/opt/miniconda3/bin",
    `${home}/.pyenv/shims`,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    `${home}/.local/bin`,
  ];
  const parts = extras.filter(
    (p) => !base.split(":").includes(p) && existsSync(p),
  );
  if (base) parts.push(base);
  return parts.join(":");
}

export interface ShellInfo {
  path: string;
  name: string;
  isDefault: boolean;
}

export function detectShells(): ShellInfo[] {
  const defaultShell = process.env.SHELL ?? "";
  const candidates: { name: string; paths: string[] }[] = [
    { name: "zsh", paths: ["/bin/zsh", "/usr/bin/zsh", "/opt/homebrew/bin/zsh"] },
    { name: "bash", paths: ["/bin/bash", "/usr/bin/bash", "/opt/homebrew/bin/bash"] },
    { name: "fish", paths: ["/opt/homebrew/bin/fish", "/usr/local/bin/fish", "/usr/bin/fish"] },
  ];
  const shells: ShellInfo[] = [];
  for (const { name, paths } of candidates) {
    for (const path of paths) {
      if (existsSync(path)) {
        shells.push({ path, name, isDefault: path === defaultShell });
        break;
      }
    }
  }
  return shells;
}

export interface ToolInfo {
  name: string;
  path: string | null;
  version: string | null;
}

export function detectTools(): ToolInfo[] {
  const tools = [
    "python3", "node", "npm", "pnpm", "git", "rustc", "cargo", "go",
    "docker", "uv", "conda", "make", "curl", "jq",
  ];
  return tools.map((name) => {
    const p = findInPath(name);
    const version = p ? getVersion(name) : null;
    return { name, path: p, version };
  });
}

function findInPath(name: string): string | null {
  const path = process.env.PATH ?? "";
  for (const dir of path.split(":")) {
    const candidate = `${dir}/${name}`;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function getVersion(name: string): string | null {
  const flag = name === "go" ? "version" : "--version";
  try {
    const out = execSync(`${name} ${flag}`, { encoding: "utf-8", timeout: 5000 });
    return out.trim().split("\n")[0] || null;
  } catch {
    return null;
  }
}
