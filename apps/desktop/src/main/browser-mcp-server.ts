/**
 * Browser MCP Server — exposes browser automation tools to the AI agent.
 *
 * MCP protocol: JSON-RPC over stdio.
 * Communicates with the Electron app's browser via a local HTTP API.
 *
 * Tools:
 *   - browser_open(url?)          — Open the browser panel (optionally navigate)
 *   - browser_close()             — Close the browser panel
 *   - browser_navigate(url)       — Navigate to a URL
 *   - browser_back()              — Go back in history
 *   - browser_forward()           — Go forward in history
 *   - browser_refresh()           — Reload the current page
 *   - browser_get_content()       — Get page text content from the webview
 *   - browser_get_html()          — Get full HTML from the webview
 *   - browser_get_url()           — Get current URL
 *   - browser_get_title()         — Get page title
 *   - browser_execute_js(code)    — Execute JavaScript and return the result
 *   - browser_click(selector)     — Click an element by CSS selector
 *   - browser_click_at(x, y)      — Click at coordinates
 *   - browser_type(selector,text) — Type text into an input
 *   - browser_select(sel,value)   — Select an option in a dropdown
 *   - browser_hover(selector)     — Hover over an element
 *   - browser_scroll(x?, y?)      — Scroll the page
 *   - browser_screenshot()        — Take a screenshot (base64 data URL)
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
    signal: AbortSignal.timeout(20_000),
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
    name: "browser_open",
    description: "打开右侧浏览器面板。可选传入 url 直接导航到目标页面",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "可选，要导航到的 URL" },
      },
    },
  },
  {
    name: "browser_close",
    description: "关闭右侧浏览器面板",
    inputSchema: { type: "object", properties: {} },
  },
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
    name: "browser_back",
    description: "浏览器后退到上一页",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_forward",
    description: "浏览器前进到下一页",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_refresh",
    description: "刷新当前页面",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_get_content",
    description: "获取当前页面的文本内容（从 webview 实际渲染的页面中提取）",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_get_html",
    description: "获取当前页面的完整 HTML",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_execute_js",
    description: "在浏览器页面中执行 JavaScript 代码并返回结果",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "要执行的 JavaScript 代码" },
      },
      required: ["code"],
    },
  },
  {
    name: "browser_click",
    description: "点击 CSS 选择器匹配的页面元素",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS 选择器，如 #submit-btn, .btn-primary, button[type=submit]" },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_click_at",
    description: "在页面指定坐标位置点击",
    inputSchema: {
      type: "object",
      properties: {
        x: { type: "number", description: "X 坐标（像素）" },
        y: { type: "number", description: "Y 坐标（像素）" },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "browser_type",
    description: "向输入框输入文本",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "输入框的 CSS 选择器" },
        text: { type: "string", description: "要输入的文本" },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "browser_select",
    description: "选择下拉框中的选项",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "下拉框的 CSS 选择器" },
        value: { type: "string", description: "要选中的选项值" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "browser_hover",
    description: "悬停到指定元素上",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "元素的 CSS 选择器" },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_scroll",
    description: "滚动当前页面",
    inputSchema: {
      type: "object",
      properties: {
        x: { type: "number", description: "水平滚动像素数（正数向右）" },
        y: { type: "number", description: "垂直滚动像素数（正数向下）" },
      },
    },
  },
  {
    name: "browser_screenshot",
    description: "截取当前页面的屏幕截图，返回 base64 编码的 PNG 图片数据 URL",
    inputSchema: { type: "object", properties: {} },
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
    // ---- Panel control ----
    case "browser_open": {
      const url = args.url as string | undefined;
      await callApi("/browser/panel", { action: "open", url });
      return { content: [{ type: "text", text: url ? `已打开浏览器面板并导航到: ${url}` : "已打开浏览器面板" }] };
    }
    case "browser_close": {
      await callApi("/browser/panel", { action: "close" });
      return { content: [{ type: "text", text: "已关闭浏览器面板" }] };
    }

    // ---- Navigation ----
    case "browser_navigate": {
      const url = args.url as string;
      await callApi("/browser/navigate", { url });
      return { content: [{ type: "text", text: `已导航到: ${url}` }] };
    }
    case "browser_back": {
      await callApi("/browser/back");
      return { content: [{ type: "text", text: "已后退" }] };
    }
    case "browser_forward": {
      await callApi("/browser/forward");
      return { content: [{ type: "text", text: "已前进" }] };
    }
    case "browser_refresh": {
      await callApi("/browser/refresh");
      return { content: [{ type: "text", text: "已刷新页面" }] };
    }

    // ---- Content reading ----
    case "browser_get_content": {
      const result = await callApi("/browser/content", {});
      return { content: [{ type: "text", text: result as string }] };
    }
    case "browser_get_html": {
      const result = await callApi("/browser/get-html");
      return { content: [{ type: "text", text: result as string }] };
    }
    case "browser_get_url": {
      const result = await callApi("/browser/get-url");
      return { content: [{ type: "text", text: result as string }] };
    }
    case "browser_get_title": {
      const result = await callApi("/browser/get-title");
      return { content: [{ type: "text", text: result as string }] };
    }

    // ---- JS execution ----
    case "browser_execute_js": {
      const code = args.code as string;
      const result = await callApi("/browser/execute-js", { code, requestId: true });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // ---- Interaction ----
    case "browser_click": {
      const selector = args.selector as string;
      const result = await callApi("/browser/click", { selector });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    case "browser_click_at": {
      const x = args.x as number;
      const y = args.y as number;
      const result = await callApi("/browser/click-at", { x, y });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    case "browser_type": {
      const selector = args.selector as string;
      const text = args.text as string;
      const result = await callApi("/browser/type", { selector, text });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    case "browser_select": {
      const selector = args.selector as string;
      const value = args.value as string;
      const result = await callApi("/browser/select", { selector, value });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    case "browser_hover": {
      const selector = args.selector as string;
      const result = await callApi("/browser/hover", { selector });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    case "browser_scroll": {
      const x = args.x as number | undefined;
      const y = args.y as number | undefined;
      const result = await callApi("/browser/scroll", { x, y });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // ---- Screenshot ----
    case "browser_screenshot": {
      const result = await callApi("/browser/screenshot");
      return { content: [{ type: "image", data: result as string, mimeType: "image/png" }] };
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
      case "tools/call": {
        if (!req.params || !req.params.name) {
          return { ...base, error: { code: -32602, message: "Missing tool name" } };
        }
        const result = await handleToolCall(
          req.params.name as string,
          (req.params.arguments as Record<string, unknown>) ?? {},
        );
        return { ...base, result };
      }
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