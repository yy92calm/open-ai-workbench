import { useState, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, Globe, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Simple browser panel — URL bar + iframe for the right sidebar.
 * The agent can reference the current URL via `browserUrl` in the runtime store.
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentUrl = history[historyIndex] || "about:blank";

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
  }, [history, historyIndex, onUrlChange]);

  const goBack = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setInput(history[idx]);
      onUrlChange(history[idx]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setInput(history[idx]);
      onUrlChange(history[idx]);
    }
  };

  const refresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30"
          title="后退"
        >
          <ArrowLeft size={13} />
        </button>
        <button
          onClick={goForward}
          disabled={!canGoForward}
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30"
          title="前进"
        >
          <ArrowRight size={13} />
        </button>
        <button
          onClick={refresh}
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text"
          title="刷新"
        >
          <RefreshCw size={13} />
        </button>
        <div className="relative flex-1">
          <Globe size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                navigate(input);
              }
            }}
            placeholder="输入网址…"
            className="w-full rounded-input border border-border bg-bg py-1 pl-7 pr-2 text-[11px] text-text outline-none placeholder:text-muted focus:border-accent/40"
          />
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text"
          title="关闭浏览器"
        >
          <X size={13} />
        </button>
      </div>

      {/* Iframe */}
      <div className="min-h-0 flex-1 bg-white">
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="浏览器"
        />
      </div>
    </div>
  );
}