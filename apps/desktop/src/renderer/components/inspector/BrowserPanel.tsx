import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight, Globe, RefreshCw, Terminal, X } from "lucide-react";

/**
 * Browser panel using Electron's <webview> for full browser automation.
 * The agent can execute JavaScript, navigate, and read page content.
 */
export function BrowserPanel({
  url,
  onUrlChange,
  onClose,
}: {
  url: string;
  onUrlChange: (url: string) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState(url);
  const [history, setHistory] = useState<string[]>([url || "https://www.google.com"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showJsConsole, setShowJsConsole] = useState(false);
  const [jsInput, setJsInput] = useState("");
  const [jsResult, setJsResult] = useState("");
  const webviewRef = useRef<HTMLElement & {
    src: string;
    loadURL: (url: string) => void;
    getURL: () => string;
    getTitle: () => string;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    executeJavaScript: (code: string) => Promise<unknown>;
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    addEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
    removeEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  } | null>(null);

  const currentUrl = history[historyIndex] || "about:blank";

  // Sync external URL changes
  useEffect(() => {
    if (url && url !== currentUrl && url !== webviewRef.current?.getURL()) {
      setInput(url);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(url);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      webviewRef.current?.loadURL(url);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Listen for webview navigation events
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const onNavigate = (e: { url: string }) => {
      if (e.url && e.url !== currentUrl) {
        setInput(e.url);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(e.url);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        onUrlChange(e.url);
      }
    };
    wv.addEventListener("did-navigate", onNavigate);
    wv.addEventListener("did-navigate-in-page", onNavigate);
    return () => {
      wv.removeEventListener("did-navigate", onNavigate);
      wv.removeEventListener("did-navigate-in-page", onNavigate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, historyIndex, onUrlChange]);

  const navigate = useCallback((target: string) => {
    let href = target.trim();
    if (!href) return;
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href}`;
    }
    setInput(href);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(href);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onUrlChange(href);
    webviewRef.current?.loadURL(href);
  }, [history, historyIndex, onUrlChange]);

  const goBack = () => {
    if (historyIndex > 0) {
      webviewRef.current?.goBack();
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setInput(history[idx]);
      onUrlChange(history[idx]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      webviewRef.current?.goForward();
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setInput(history[idx]);
      onUrlChange(history[idx]);
    }
  };

  const refresh = () => {
    webviewRef.current?.reload();
  };

  const runJs = async () => {
    if (!jsInput.trim() || !webviewRef.current) return;
    try {
      const result = await webviewRef.current.executeJavaScript(jsInput.trim());
      setJsResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setJsResult(`错误: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* URL bar */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <button onClick={goBack} disabled={!canGoBack} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30" title="后退">
          <ArrowLeft size={13} />
        </button>
        <button onClick={goForward} disabled={!canGoForward} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30" title="前进">
          <ArrowRight size={13} />
        </button>
        <button onClick={refresh} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text" title="刷新">
          <RefreshCw size={13} />
        </button>
        <div className="relative flex-1">
          <Globe size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); navigate(input); } }}
            placeholder="输入网址…"
            className="w-full rounded-input border border-border bg-bg py-1 pl-7 pr-2 text-[11px] text-text outline-none placeholder:text-muted focus:border-accent/40"
          />
        </div>
        <button
          onClick={() => setShowJsConsole(!showJsConsole)}
          className={showJsConsole ? "rounded p-1 text-accent" : "rounded p-1 text-muted hover:text-text"}
          title="JavaScript 控制台"
        >
          <Terminal size={13} />
        </button>
        <button onClick={onClose} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text" title="关闭浏览器">
          <X size={13} />
        </button>
      </div>

      {/* JS Console */}
      {showJsConsole && (
        <div className="border-b border-border px-2 py-1.5">
          <div className="flex gap-1">
            <input
              value={jsInput}
              onChange={(e) => setJsInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runJs(); } }}
              placeholder="输入 JavaScript 代码…"
              className="flex-1 rounded-input border border-border bg-bg px-2 py-1 font-mono text-[11px] text-text outline-none placeholder:text-muted focus:border-accent/40"
            />
            <button onClick={runJs} className="rounded-input bg-accent px-2 py-1 text-[11px] text-accent-fg hover:opacity-90">
              执行
            </button>
          </div>
          {jsResult && (
            <pre className="mt-1 max-h-24 overflow-y-auto rounded bg-bg-soft px-2 py-1 font-mono text-[11px] text-text">
              {jsResult}
            </pre>
          )}
        </div>
      )}

      {/* Webview */}
      <div className="min-h-0 flex-1">
        <webview
          ref={webviewRef as React.RefObject<HTMLElement>}
          src={currentUrl}
          style={{ height: "100%", width: "100%" }}
          allowpopups="true"
        />
      </div>
    </div>
  );
}