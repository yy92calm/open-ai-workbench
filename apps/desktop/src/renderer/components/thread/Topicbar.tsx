import { useMemo, useState } from "react";
import { FolderOpen, Globe, PanelRight, Terminal } from "lucide-react";
import { useRuntimeStore } from "@/lib/runtime";
import { DRAFT_KEY } from "@/lib/runtime";
import { cn } from "@/lib/cn";
import { ShortcutsCheatsheet } from "@/components/command-palette/ShortcutsCheatsheet";

const STATUS_TONE: Record<string, string> = {
  ready: "bg-ok",
  connecting: "bg-warn animate-pulse",
  error: "bg-error",
  offline: "bg-muted",
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function Topicbar({
  title,
  onToggleRightPanel,
  onToggleBrowser,
  onToggleTerminal,
  onToggleFileBrowser,
  rightPanelOpen,
  showBrowser,
  showTerminal,
  showFileBrowser,
}: {
  title?: string;
  onToggleRightPanel?: () => void;
  onToggleBrowser?: () => void;
  onToggleTerminal?: () => void;
  onToggleFileBrowser?: () => void;
  rightPanelOpen?: boolean;
  showBrowser?: boolean;
  showTerminal?: boolean;
  showFileBrowser?: boolean;
}) {
  const status = useRuntimeStore((s) => s.status);
  const currentId = useRuntimeStore((s) => s.currentId);
  const threads = useRuntimeStore((s) => s.threads);
  const thread = currentId ? threads[currentId] : threads[DRAFT_KEY];
  const [showShortcuts, setShowShortcuts] = useState(false);

  const totalTokens = useMemo(() => {
    if (!thread) return 0;
    let n = 0;
    for (const b of thread.blocks) {
      switch (b.kind) {
        case "user": n += b.text.length; break;
        case "agent": n += b.markdown.length; break;
        case "reasoning": n += b.text.length; break;
        case "tool-call": {
          n += b.inputSummary?.length ?? 0;
          n += b.outputSummary?.length ?? 0;
          break;
        }
      }
    }
    return Math.ceil(n / 4);
  }, [thread]);

  return (
    <header className="topicbar flex h-9 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_TONE[status] ?? "bg-muted")} />
      <h1 className="truncate text-sm font-medium text-text">
        {title || "新会话"}
      </h1>
      <div className="flex-1" />
      {onToggleTerminal && (
        <button
          onClick={onToggleTerminal}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-input transition-colors",
            showTerminal ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-2 hover:text-text",
          )}
          aria-label="终端"
          title="终端"
        >
          <Terminal size={14} />
        </button>
      )}
      {onToggleFileBrowser && (
        <button
          onClick={onToggleFileBrowser}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-input transition-colors",
            showFileBrowser ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-2 hover:text-text",
          )}
          aria-label="文件"
          title="文件"
        >
          <FolderOpen size={14} />
        </button>
      )}
      {onToggleBrowser && (
        <button
          onClick={onToggleBrowser}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-input transition-colors",
            showBrowser ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-2 hover:text-text",
          )}
          aria-label="浏览器"
          title="浏览器"
        >
          <Globe size={14} />
        </button>
      )}
      {onToggleRightPanel && (
        <button
          onClick={onToggleRightPanel}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-input transition-colors",
            rightPanelOpen ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-2 hover:text-text",
          )}
          aria-label="右侧面板"
          title="右侧面板"
        >
          <PanelRight size={14} />
        </button>
      )}
      {totalTokens > 0 && (
        <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted" title="会话中预估 Token 数">
          ~{totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}
        </span>
      )}
      <ShortcutsCheatsheet open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </header>
  );
}