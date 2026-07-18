import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FileText, Folder, Image as ImageIcon, Loader2, NotebookPen, Sheet, X } from "lucide-react";
import { listDir, type DirEntry } from "@/lib/artifactFile";
import { isTauri, workspaceBase } from "@/lib/tauri";
import { baseName } from "@/components/thread/WorkspaceChip";
import { cn } from "@/lib/cn";
import { extOf, extToKind, previewKindForName, type PreviewKind } from "@/lib/artifacts";
import { FilePreviewInspector } from "@/components/inspector/FilePreviewInspector";

function iconFor(entry: DirEntry) {
  if (entry.isDir) return <Folder size={14} className="text-accent" />;
  const cls = "text-muted";
  if (entry.name.endsWith(".ipynb")) return <NotebookPen size={14} className={cls} />;
  if (entry.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return <ImageIcon size={14} className={cls} />;
  if (entry.name.match(/\.(csv|xlsx?)$/i)) return <Sheet size={14} className={cls} />;
  return <FileText size={14} className={cls} />;
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const EXT_LANG: Record<string, string> = {
  py: "python", r: "r", jl: "julia", sh: "bash", tex: "latex", md: "markdown",
};

/**
 * File browser panel for the right sidebar.
 * Browses from the workspace base folder and supports file preview.
 */
export function FileBrowserPanel({ onClose }: { onClose: () => void }) {
  const [dir, setDir] = useState("");
  const [entries, setEntries] = useState<DirEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [basePath, setBasePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<DirEntry | null>(null);

  useEffect(() => {
    void workspaceBase().then(setBasePath).catch(() => {});
  }, []);

  const load = useCallback(async (rel: string) => {
    setEntries(null);
    setError(null);
    setPreview(null);
    try {
      setEntries(await listDir(rel, "base"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    void load(dir);
  }, [dir, load]);

  const crumbs = dir ? dir.split("/") : [];

  // Preview mode
  if (preview) {
    const ext = extOf(preview.name);
    const kind: PreviewKind = previewKindForName(preview.name);
    return (
      <div className="flex h-full flex-col bg-surface">
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <button
            onClick={() => setPreview(null)}
            className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-surface-2 hover:text-text"
          >
            ← 返回
          </button>
          <span className="truncate text-[11px] text-text">{preview.name}</span>
          <span className="flex-1" />
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text">
            <X size={13} />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <FilePreviewInspector
            data={{
              variant: "file",
              path: preview.path,
              filename: preview.name,
              artifact: extToKind(ext),
              language: EXT_LANG[ext] ?? (kind === "text" ? ext : undefined),
              root: "base",
            }}
            onClose={() => setPreview(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted">文件</span>
        <button onClick={onClose} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-text">
          <X size={13} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5 text-[11px]">
        <button
          className={cn("rounded px-1 hover:bg-surface-2", dir ? "text-link" : "font-medium text-text")}
          onClick={() => setDir("")}
          title={basePath ?? undefined}
        >
          {baseName(basePath)}
        </button>
        {crumbs.map((part, i) => {
          const to = crumbs.slice(0, i + 1).join("/");
          return (
            <span key={to} className="flex items-center gap-0.5">
              <ChevronRight size={10} className="text-muted" />
              <button
                className={cn("rounded px-1 hover:bg-surface-2", i === crumbs.length - 1 ? "font-medium text-text" : "text-link")}
                onClick={() => setDir(to)}
              >
                {part}
              </button>
            </span>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {entries === null && (
          <div className="flex items-center gap-2 p-2 text-xs text-muted">
            <Loader2 size={12} className="animate-spin" /> 加载中…
          </div>
        )}
        {error && <div className="p-2 text-xs text-error">{error}</div>}
        {entries && entries.length === 0 && !error && (
          <div className="p-2 text-xs text-muted">
            {isTauri ? "此文件夹为空。" : "文件浏览器仅在桌面端可用。"}
          </div>
        )}
        {entries?.map((entry) => (
          <button
            key={entry.path}
            onClick={() => entry.isDir ? setDir(entry.path) : setPreview(entry)}
            className="flex w-full items-center gap-2 rounded-input px-2 py-1.5 text-left text-xs hover:bg-surface-2"
          >
            {iconFor(entry)}
            <span className="flex-1 truncate text-text">{entry.name}</span>
            {!entry.isDir && <span className="shrink-0 text-[10px] text-muted">{humanSize(entry.size)}</span>}
            {entry.isDir && <ChevronRight size={12} className="shrink-0 text-muted" />}
          </button>
        ))}
      </div>
    </div>
  );
}