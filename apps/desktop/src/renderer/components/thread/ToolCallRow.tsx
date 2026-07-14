import { useState } from "react";
import { AlertTriangle, Check, ChevronRight, Clock, Loader2, ShieldQuestion, X } from "lucide-react";
import type { ToolCallBlock, ToolCallStatus } from "@workbench/shared";
import { cn } from "@/lib/cn";

const STATUS: Record<
  ToolCallStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  pending: { label: "Pending", icon: <Clock size={13} />, className: "text-muted" },
  running: { label: "Running", icon: <Loader2 size={13} className="animate-spin" />, className: "text-accent" },
  "waiting-approval": { label: "Waiting", icon: <ShieldQuestion size={14} />, className: "text-warn" },
  success: { label: "Success", icon: <Check size={13} />, className: "text-ok" },
  warning: { label: "Warning", icon: <AlertTriangle size={14} />, className: "text-warn" },
  failed: { label: "Failed", icon: <X size={14} />, className: "text-error" },
};

/** A collapsible card for tool calls — compact header with status icon,
 *  expandable body showing input/output detail. */
export function ToolCallRow({ block, activity }: { block: ToolCallBlock; activity?: string }) {
  const s = STATUS[block.status];
  const [expanded, setExpanded] = useState(false);

  const isRunning = block.status === "running";
  const isError = block.status === "failed" || block.status === "warning";
  const isWaiting = block.status === "waiting-approval";

  return (
    <div
      data-status={block.status}
      className={cn(
        "rounded-lg border transition-colors",
        isError
          ? "border-warn/30 bg-surface"
          : isWaiting
            ? "border-warn/25 bg-surface"
            : "border-border-soft bg-surface/60",
      )}
    >
      {/* Header — always visible, clickable to toggle */}
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-2/50"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className={cn("flex shrink-0 items-center", s.className)} aria-label={s.label}>
          {s.icon}
        </span>
        <span
          className={cn(
            "flex-1 truncate text-[13px] font-mono",
            isRunning ? "text-text" : isError ? "text-text" : "text-text-dim",
          )}
        >
          {block.title}
        </span>
        {block.meta && (
          <span className="shrink-0 text-[11px] text-muted">{block.meta}</span>
        )}
        <ChevronRight
          size={13}
          className={cn(
            "shrink-0 text-muted transition-transform duration-150",
            expanded && "rotate-90",
          )}
        />
      </button>

      {/* Input summary — shown collapsed when no expandable detail */}
      {!expanded && block.inputSummary && (
        <div className="truncate px-3 pb-2 pl-[34px] text-[12px] text-muted">
          {block.inputSummary}
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border-soft px-3 pb-3 pt-2">
          {block.inputSummary && (
            <div className="mb-2">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                Input
              </div>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-bg-soft px-3 py-2 font-mono text-[12px] leading-5 text-text-dim">
                {block.inputSummary}
              </pre>
            </div>
          )}
          {block.outputSummary && (
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                Output
              </div>
              <pre
                className={cn(
                  "max-h-64 overflow-y-auto whitespace-pre-wrap break-all rounded-md px-3 py-2 font-mono text-[12px] leading-5",
                  block.status === "failed"
                    ? "bg-error/8 text-error"
                    : "bg-bg-soft text-text-dim",
                )}
              >
                {block.outputSummary}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Subagent activity indicator */}
      {activity && isRunning && (
        <div className="flex items-center gap-2 border-t border-border-soft px-3 py-1.5 text-[12px]">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" />
          <span className="min-w-0 flex-1 truncate font-mono text-muted">{activity}</span>
        </div>
      )}
    </div>
  );
}