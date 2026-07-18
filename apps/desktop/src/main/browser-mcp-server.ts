/**
 * Browser MCP Server — exposes browser automation tools to the AI agent.
 *
 * MCP protocol: JSON-RPC over stdio.
 * Communicates with the Electron app's browser via a local HTTP API.
 *
 * Tools:
 *   - browser_navigate(url)     — Navigate to a URL
 *   - browser_get_content(url?)  — Get page content as text
 *   - browser_execute_js(code)   — Execute JavaScript in the page
 *   - browser_get_url()          — Get current URL
 *   - browser_get_title()        — Get page title
 */

const API_PORT = 43921;
const API_BASE = `http://127.0.0.1:${API_PORT}`;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

/** Call the Electron app's browser API. */
async function callApi(endpoint: string, body?: unknown): Promise<unknown> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Tool definitions for the MCP protocol
const TOOLS = [
  {
    name: "browser_navigate",
    description: "导航到指定 URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "目标 URL" },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_get_content",
    description: "获取当前页面的文本内容",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "可选，指定 URL 获取内容" },
      },
    },
  },
  {
    name: "browser_execute_js",
    description: "在浏览器页面中执行 JavaScript 代码",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "要执行的 JavaScript 代码" },
      },
      required: ["code"],
    },
  },
  {
    name: "browser_get_url",
    description: "获取浏览器当前 URL",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_get_title",
    description: "获取浏览器当前页面标题",
    inputSchema: { type: "object", properties: {} },
  },
];

/** Handle an MCP tool call. */
async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "browser_navigate": {
      const url = args.url as string;
      await callApi("/browser/navigate", { url });
      return { content: [{ type: "text", text: `已导航到: ${url}` }] };
    }
    case "browser_get_content": {
      const url = args.url as string | undefined;
      const result = await callApi("/browser/content", { url });
      return { content: [{ type: "text", text: result as string }] };
    }
    case "browser_execute_js": {
      const code = args.code as string;
      const result = await callApi("/browser/execute-js", { code });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    case "browser_get_url": {
      const result = await callApi("/browser/url");
      return { content: [{ type: "text", text: result as string }] };
    }
    case "browser_get_title": {
      const result = await callApi("/browser/title");
      return { content: [{ type: "text", text: result as string }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/** Process a single JSON-RPC request. */
async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const base = { jsonrpc: "2.0" as const, id: req.id };

  try {
    switch (req.method) {
      case "tools/list":
        return { ...base, result: { tools: TOOLS } };
      case "tools/call":
        if (!req.params || !req.params.name) {
          return { ...base, error: { code: -32602, message: "Missing tool name" } };
        }
        const result = await handleToolCall(
          req.params.name as string,
          (req.params.arguments as Record<string, unknown>) ?? {},
        );
        return { ...base, result };
      case "initialize":
        return { ...base, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} } } };
      case "notifications/initialized":
        return { ...base, result: null };
      default:
        return { ...base, error: { code: -32601, message: `Method not found: ${req.method}` } };
    }
  } catch (err) {
    return {
      ...base,
      error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
    };
  }
}

// Main loop: read JSON-RPC requests from stdin, write responses to stdout.
let buffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", async (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const req: JsonRpcRequest = JSON.parse(trimmed);
      const res = await handleRequest(req);
      process.stdout.write(JSON.stringify(res) + "\n");
    } catch (err) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: `Parse error: ${err instanceof Error ? err.message : String(err)}` },
        }) + "\n",
      );
    }
  }
});

process.stdin.on("end", () => process.exit(0));

// Signal readiness
process.stderr.write("browser-mcp-server: started\n");