import { useMemo, useState } from "react";
import { Check, ChevronRight, X } from "lucide-react";
import type { ArtifactBlock, FigureAnnotation, ThreadBlock } from "@workbench/shared";
import { cn } from "@/lib/cn";
import { AgentMessage, DataTable, RunningJobsOverlay, StatusLine, UserMessage } from "./atoms";
import { ToolCallRow } from "./ToolCallRow";
import { StepSummaryRow } from "./StepSummaryRow";
import { FigureBlock } from "./FigureBlock";
import { ArtifactCard } from "./ArtifactCard";
import { TurnDivider } from "./TurnDivider";
import { ReasoningCard } from "./ReasoningCard";
import { ShellCard } from "./ShellCard";

export interface BlockHandlers {
  /** Open an artifact in the inspector (live session). */
  onArtifactOpen?: (a: ArtifactBlock) => void;
  /** Forward a figure annotation to the agent (live session). */
  onFigureComment?: (annotation: FigureAnnotation, figureTitle: string) => void;
  /** Live one-line activity of the subagent a task tool spawned (live session). */
  subagentActivity?: (childSessionId: string) => string | undefined;
  /** User clicked edit on a user message. */
  onUserMessageEdit?: (text: string) => void;
}

/** A renderable item: either a single block or a group of consecutive tool-call blocks. */
type RenderItem =
  | { type: "block"; block: ThreadBlock; key: number }
  | { type: "tool-group"; blocks: ThreadBlock[]; key: number };

/** Pre-process blocks: group consecutive tool-calls (>=3) into collapsible groups. */
function prepareItems(blocks: ThreadBlock[]): RenderItem[] {
  const items: RenderItem[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    // Collect consecutive tool-call blocks
    if (b.kind === "tool-call") {
      const start = i;
      while (i < blocks.length && blocks[i].kind === "tool-call") i++;
      const count = i - start;
      if (count >= 3) {
        items.push({ type: "tool-group", blocks: blocks.slice(start, i), key: start });
      } else {
        for (let j = start; j < i; j++) {
          items.push({ type: "block", block: blocks[j], key: j });
        }
      }
    } else {
      items.push({ type: "block", block: b, key: i });
      i++;
    }
  }
  return items;
}

export function renderBlock(block: ThreadBlock, i: number, handlers?: BlockHandlers) {
  switch (block.kind) {
    case "turn-divider":
      return <TurnDivider key={i} block={block} />;
    case "user":
      return (
        <UserMessage
          key={i}
          block={block}
          onEdit={handlers?.onUserMessageEdit}
        />
      );
    case "agent":
      return (
        <AgentMessage
          key={i}
          markdown={block.markdown}
          timestamp={block.timestamp}
          onOpenArtifact={handlers?.onArtifactOpen}
        />
      );
    case "reasoning":
      return <ReasoningCard key={i} block={block} />;
    case "step-summary":
      return <StepSummaryRow key={i} block={block} />;
    case "tool-call":
      // Shell commands get their own card
      if (block.shellCommand) {
        return <ShellCard key={i} block={block} />;
      }
      return (
        <ToolCallRow
          key={i}
          block={block}
          activity={
            block.childSessionId ? handlers?.subagentActivity?.(block.childSessionId) : undefined
          }
        />
      );
    case "table":
      return <DataTable key={i} block={block} />;
    case "figure":
      return <FigureBlock key={i} block={block} onComment={handlers?.onFigureComment} />;
    case "artifact":
      return <ArtifactCard key={i} block={block} onOpen={handlers?.onArtifactOpen} />;
    case "running-jobs":
      return <RunningJobsOverlay key={i} block={block} />;
    case "status-line":
      return <StatusLine key={i} block={block} />;
  }
}

export function BlockList({
  blocks,
  handlers,
}: {
  blocks: ThreadBlock[];
  handlers?: BlockHandlers;
}) {
  const items = useMemo(() => prepareItems(blocks), [blocks]);

  return (
    <>
      {items.map((item) => {
        if (item.type === "block") {
          return renderBlock(item.block, item.key, handlers);
        }
        // Tool group
        return <ToolGroup key={item.key} blocks={item.blocks} handlers={handlers} />;
      })}
    </>
  );
}

function ToolGroup({
  blocks,
  handlers,
}: {
  blocks: ThreadBlock[];
  handlers?: BlockHandlers;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = blocks.length;
  const done = blocks.filter((b) => b.kind === "tool-call" && (b.status === "success" || b.status === "failed" || b.status === "warning")).length;
  const failed = blocks.filter((b) => b.kind === "tool-call" && b.status === "failed").length;
  const allDone = done === count;
  const hasFailed = failed > 0;

  return (
    <div className="rounded-lg border border-border-soft bg-surface/40">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-2/50"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-150",
            expanded && "rotate-90",
          )}
        />
        {allDone && !hasFailed && <Check size={13} className="shrink-0 text-ok" />}
        {hasFailed && <X size={13} className="shrink-0 text-error" />}
        <span className={cn("flex-1", allDone ? "text-text-dim" : "text-muted")}>
          {done}/{count} 工具调用
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-1.5 border-t border-border-soft px-2 py-2">
          {blocks.map((b, i) => renderBlock(b, i, handlers))}
        </div>
      )}
    </div>
  );
}
