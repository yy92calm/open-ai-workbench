import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import type { ArtifactBlock } from "@workbench/shared";
import { fileInspectorFromBlock } from "@/lib/artifacts";
import { InspectorShell } from "@/components/inspector/InspectorShell";
import { ContextPanel } from "@/components/inspector/ContextPanel";
import { useResizable } from "@/lib/useResizable";

/**
 * Right-side dock: artifact preview or session context panel, with a drag
 * resize handle. Encapsulates the resize logic, refresh button, and panel
 * switching so individual pages don't duplicate it.
 *
 * Inspired by Reasonix's `workbench-dock` layout element.
 */
export function WorkbenchDock({
  artifact,
  showFiles,
  onCloseArtifact,
  onCloseFiles,
  onEvaluate,
}: {
  artifact: ArtifactBlock | null;
  showFiles: boolean;
  onCloseArtifact: () => void;
  onCloseFiles: () => void;
  onEvaluate?: (expr: string) => void;
}) {
  const { targetRef, handleProps, isDragging } = useResizable(480, 320, Infinity, true);
  const [paneKey, setPaneKey] = useState(0);
  const refreshPane = useCallback(() => setPaneKey((k) => k + 1), []);
  const open = !!(artifact || showFiles);

  if (!open) return null;

  return (
    <>
      {/* Drag handle to resize the right pane */}
      <div
        {...handleProps}
        className="w-1 shrink-0 cursor-col-resize hover:bg-accent/30 active:bg-accent/50 transition-colors"
      />
      <div
        ref={targetRef as React.RefObject<HTMLDivElement>}
        className="hidden shrink-0 lg:block"
        style={{ width: 480, contentVisibility: isDragging ? "hidden" : undefined }}
      >
        {artifact && (
          <div className="relative h-full">
            <button
              onClick={refreshPane}
              className="absolute right-2 top-2 z-sticky rounded-input border border-border bg-surface p-1.5 text-muted hover:bg-surface-2 hover:text-text"
              title="刷新预览"
            >
              <RefreshCw size={14} />
            </button>
            <InspectorShell
              key={paneKey}
              inspector={fileInspectorFromBlock(artifact)}
              onClose={onCloseArtifact}
              onEvaluate={onEvaluate}
            />
          </div>
        )}
        {!artifact && showFiles && (
          <ContextPanel onClose={onCloseFiles} />
        )}
      </div>
    </>
  );
}