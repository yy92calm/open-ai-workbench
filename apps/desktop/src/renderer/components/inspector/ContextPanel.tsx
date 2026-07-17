import { useState } from "react";
import { Files, Wrench, Brain, Shield, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useRuntimeStore } from "@/lib/runtime";
import { SessionFilesPane } from "@/app/routes/FilesPage";

type Tab = "files" | "tools" | "memory" | "rules";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "files", label: "Files", icon: <Files size={13} /> },
  { id: "tools", label: "Tools", icon: <Wrench size={13} /> },
  { id: "memory", label: "Memory", icon: <Brain size={13} /> },
  { id: "rules", label: "Rules", icon: <Shield size={13} /> },
];

/**
 * Right-side context panel with four tabs: Files, Tools, Memory, Rules.
 * Shown when no artifact is actively being previewed.
 */
export function ContextPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("files");

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b border-border px-2 pt-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1 rounded-t px-2 py-1 text-[11px] transition-colors",
              tab === t.id
                ? "bg-surface-2 text-text"
                : "text-muted hover:text-text",
            )}
          >
            <span className="text-muted">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <span className="flex-1" />
        <button
          onClick={onClose}
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text"
          title="关闭面板"
        >
          <X size={13} />
        </button>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "files" && <SessionFilesPane onClose={onClose} />}
        {tab === "tools" && <ToolsTab />}
        {tab === "memory" && <PlaceholderTab title="Memory" description="Conversation memory will appear here." />}
        {tab === "rules" && <PlaceholderTab title="Rules" description="Project rules and guidelines will appear here." />}
      </div>
    </div>
  );
}

function ToolsTab() {
  const tools = useRuntimeStore((s) => s.tools);
  const mcpServers = useRuntimeStore((s) => s.mcpServers);

  return (
    <div className="space-y-3 p-3 text-[12px]">
      {/* MCP Servers */}
      {mcpServers.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            MCP Servers
          </div>
          <div className="space-y-1">
            {mcpServers.map((s) => (
              <div key={s.name} className="flex items-center gap-2 rounded-input bg-surface-2 px-2 py-1.5">
                <span className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  s.status === "connected" ? "bg-green-500" : "bg-muted",
                )} />
                <span className="truncate font-mono text-text">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detected tools */}
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          Runtime Tools
        </div>
        {tools.length === 0 ? (
          <div className="text-muted">No tools detected yet.</div>
        ) : (
          <div className="space-y-1">
            {tools.map((t) => (
              <div key={t.name} className="flex items-center gap-2 rounded-input bg-surface-2 px-2 py-1.5">
                <span className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  t.found ? "bg-green-500" : "bg-red-400",
                )} />
                <span className="truncate font-mono text-text">{t.name}</span>
                {t.version && (
                  <span className="shrink-0 text-[10px] text-muted">{t.version}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="space-y-1.5">
        <div className="text-[12px] font-medium text-muted">{title}</div>
        <div className="text-[11px] text-muted/70">{description}</div>
      </div>
    </div>
  );
}
