import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, X } from "lucide-react";
import { readArtifact, writeWorkspaceFile } from "@/lib/artifactFile";
import { ipynbToStarboard, starboardToIpynb } from "@/lib/starboard-ipynb";
import "starboard-notebook";
import { cn } from "@/lib/cn";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "starboard-notebook": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface StarboardNotebookElement extends HTMLElement {
  runtime?: {
    controls: {
      save: (opts: unknown) => boolean;
      contentChanged: () => void;
    };
    content: {
      metadata: unknown;
      cells: Array<{
        cellType: string;
        textContent: string;
        id: string;
      }>;
    };
  };
}

export function StarboardEditor({
  path,
  root,
  onBack,
  onClose,
}: {
  path: string;
  root?: "workspace" | "base";
  onBack?: () => void;
  onClose?: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nbRef = useRef<StarboardNotebookElement>(null);
  const savedContentRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const f = await readArtifact(path, root);
      if (!f || f.encoding !== "utf8") throw new Error("could not read the notebook");
      const starboardText = ipynbToStarboard(f.data);
      savedContentRef.current = starboardText;
      setContent(starboardText);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [path, root]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    const el = nbRef.current;
    if (!el?.runtime) return;
    try {
      const cells = el.runtime.content.cells;
      const starboardText = cells.map((c) => {
        const header = `# %% [${c.cellType}]`;
        return header + "\n" + c.textContent;
      }).join("\n\n") + "\n";
      const ipynb = starboardToIpynb(starboardText);
      await writeWorkspaceFile(path, ipynb, root);
      savedContentRef.current = starboardText;
    } catch {
      /* ignore */
    }
  }, [path, root]);

  // Auto-save every 5 seconds
  useEffect(() => {
    const t = setInterval(() => {
      void save();
    }, 5000);
    return () => clearInterval(t);
  }, [save]);

  // Listen for Ctrl+S / Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          {onBack && <button className="text-muted hover:text-text" onClick={onBack}><ArrowLeft size={15} /></button>}
          <span className="text-sm text-error">{error}</span>
          {onClose && <button className="ml-auto text-muted hover:text-text" onClick={onClose}><X size={16} /></button>}
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          {onBack && <button className="text-muted hover:text-text" onClick={onBack}><ArrowLeft size={15} /></button>}
          <span className="text-sm text-muted">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        {onBack && (
          <button className="text-muted hover:text-text" aria-label="Back" onClick={onBack}>
            <ArrowLeft size={15} />
          </button>
        )}
        <span className="truncate text-[13px] font-medium text-text">{path}</span>
        <div className="flex-1" />
        <button
          className="text-muted hover:text-text"
          aria-label="Reload"
          title="Reload from disk"
          onClick={() => void load()}
        >
          <RefreshCw size={14} />
        </button>
        {onClose && (
          <button className="text-muted hover:text-text" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <starboard-notebook
          ref={nbRef as React.Ref<HTMLElement>}
          className={cn("block h-full w-full")}
          style={{ height: "100%" }}
        />
      </div>
      {/* Set initial content via script injection */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.initialNotebookContent = ${JSON.stringify(content)};`,
        }}
      />
    </div>
  );
}