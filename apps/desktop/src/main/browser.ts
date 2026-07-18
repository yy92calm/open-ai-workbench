import { get } from "node:https";
import { get as httpGet } from "node:http";

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