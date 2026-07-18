import { useMemo, useState } from "react";
import { BookOpen, FolderOpen, Globe, PanelRightClose, Terminal, X } from "lucide-react";
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

const TABS = [
  { id: "context" as const, label: "上下文", icon: <BookOpen size={14} /> },
  { id: "browser" as const, label: "浏览器", icon: <Globe size={14} /> },
  { id: "terminal" as const, label: "终端", icon: <Terminal size={14} /> },
  { id: "files" as const, label: "文件", icon: <FolderOpen size={14} /> },
];

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function Topicbar({
  title,
  rightPanelOpen,
  currentTab,
  onTabChange,
  onClosePanel,
}: {
  title?: string;
  rightPanelOpen: boolean;
  currentTab: string;
  onTabChange: (tab: "context" | "browser" | "terminal" | "files") => void;
  onClosePanel: () => void;
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
      {/* Right sidebar tabs */}
      <div className="flex items-center gap-0.5 rounded-input bg-surface-2 p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium transition-colors",
              rightPanelOpen && currentTab === t.id
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:text-text",
            )}
            title={t.label}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>
      {rightPanelOpen && (
        <button
          onClick={onClosePanel}
          className="flex h-7 w-7 items-center justify-center rounded-input text-muted hover:bg-surface-2 hover:text-text"
          title="关闭面板"
        >
          <PanelRightClose size={14} />
        </button>
      )}
      {totalTokens > 0 && (
        <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted" title="会话中预估 Token 数">
          ~{totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}
        </span>
      )}
      <ShortcutsCheatsheet open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </header>
  );
}