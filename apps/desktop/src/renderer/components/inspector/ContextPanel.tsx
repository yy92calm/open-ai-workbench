import { X } from "lucide-react";
import { TokenUsage } from "./TokenUsage";

/**
 * Right-side context panel showing token usage and session info.
 */
export function ContextPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-medium text-muted">上下文</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text"
          title="关闭面板"
        >
          <X size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TokenUsage />
      </div>
    </div>
  );
}