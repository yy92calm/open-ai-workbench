import { get } from "node:https";
import { get as httpGet } from "node:http";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { app } from "electron";

/**
 * Browser service for the main process.
 * Provides navigation and content fetching for the in-app browser.
 * The agent calls these via IPC to operate the browser remotely.
 */

/** Fetch a page's content via HTTP GET. Returns the full HTML body. */
export function fetchPageContent(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fetcher = url.startsWith("https") ? get : httpGet;
    fetcher(url, { timeout: 15_000 }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const html = Buffer.concat(chunks).toString("utf-8");
        resolve(html);
      });
      res.on("error", reject);
    }).on("error", reject).on("timeout", function () {
      this.destroy();
      reject(new Error("请求超时"));
    });
  });
}

/** Extract readable text from HTML (strip tags, scripts, styles). */
export function extractText(html: string, maxLength = 10_000): string {
  let text = html
    // Remove scripts and styles
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Extract <title> if present
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Truncate
  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + "...";
  }

  return title ? `标题: ${title}\n\n${text}` : text;
}

/** Path to the compiled browser MCP server script. */
function browserMcpScriptPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "out", "main", "browser-mcp-server.js");
  }
  return join(app.getAppPath(), "out", "main", "browser-mcp-server.js");
}

/**
 * Deploy the browser MCP server configuration into the user's opencode.json.
 * Called automatically when the sidecar starts.
 */
export function deployBrowserProfile(xdgConfig: string): void {
  const opencodeDir = join(xdgConfig, "opencode");
  const configPath = join(opencodeDir, "opencode.json");
  mkdirSync(opencodeDir, { recursive: true });

  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch { /* start fresh if missing */ }

  const mcpSection = (config.mcp ?? {}) as Record<string, unknown>;
  mcpSection["browser"] = {
    type: "local",
    command: ["node", browserMcpScriptPath()],
    enabled: true,
  };
  config.mcp = mcpSection;
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}