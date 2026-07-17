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

/** Spacing rhythm: different block transitions need different visual gaps. */
function spacingBefore(kind: ThreadBlock["kind"]): string {
  switch (kind) {
    case "user":
      return "mt-5";
    case "agent":
      return "mt-4";
    case "tool-call":
    case "step-summary":
      return "mt-1.5";
    case "reasoning":
      return "mt-3";
    case "turn-divider":
      return "mt-2";
    default:
      return "mt-2";
  }
}

export function renderBlock(block: ThreadBlock, i: number, handlers?: BlockHandlers, prevKind?: ThreadBlock["kind"]) {
  const sp = spacingBefore(block.kind);
  switch (block.kind) {
    case "turn-divider":
      return <TurnDivider key={i} block={block} />;
    case "user":
      return (
        <div key={i} id={`block-${i}`} className={prevKind ? sp : ""}>
          <UserMessage
            block={block}
            onEdit={handlers?.onUserMessageEdit}
          />
        </div>
      );
    case "agent":
      return (
        <div key={i} className={prevKind ? sp : ""}>
          <AgentMessage
            markdown={block.markdown}
            timestamp={block.timestamp}
            onOpenArtifact={handlers?.onArtifactOpen}
          />
        </div>
      );
    case "reasoning":
      return <div key={i} className={prevKind ? sp : ""}><ReasoningCard block={block} /></div>;
    case "step-summary":
      return <div key={i} className={prevKind ? sp : ""}><StepSummaryRow block={block} /></div>;
    case "tool-call":
      // Shell commands get their own card
      if (block.shellCommand) {
        return <div key={i} className={prevKind ? sp : ""}><ShellCard block={block} /></div>;
      }
      return (
        <div key={i} className={prevKind ? sp : ""}>
          <ToolCallRow
            block={block}
            activity={
              block.childSessionId ? handlers?.subagentActivity?.(block.childSessionId) : undefined
            }
          />
        </div>
      );
    case "table":
      return <div key={i} className={prevKind ? sp : ""}><DataTable block={block} /></div>;
    case "figure":
      return <div key={i} className={prevKind ? sp : ""}><FigureBlock block={block} onComment={handlers?.onFigureComment} /></div>;
    case "artifact":
      return <div key={i} className={prevKind ? sp : ""}><ArtifactCard block={block} onOpen={handlers?.onArtifactOpen} /></div>;
    case "running-jobs":
      return <div key={i} className={prevKind ? sp : ""}><RunningJobsOverlay block={block} /></div>;
    case "status-line":
      return <div key={i} className={prevKind ? sp : ""}><StatusLine block={block} /></div>;
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
      {items.map((item, idx) => {
        if (item.type === "block") {
          const prevKind = idx > 0
            ? (items[idx - 1].type === "tool-group" ? "tool-call" as const : (items[idx - 1] as { type: "block"; block: ThreadBlock }).block.kind)
            : undefined;
          return renderBlock(item.block, item.key, handlers, prevKind);
        }
        // Tool group
        const prevKind = idx > 0
          ? (items[idx - 1].type === "tool-group" ? "tool-call" as const : (items[idx - 1] as { type: "block"; block: ThreadBlock }).block.kind)
          : undefined;
        return (
          <div key={item.key} className={prevKind ? spacingBefore("tool-call") : ""}>
            <ToolGroup blocks={item.blocks} handlers={handlers} />
          </div>
        );
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
