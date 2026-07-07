import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Files, FolderTree, NotebookPen, Plus, Search, Settings, Star, Trash2 } from "lucide-react";
import type { Project } from "@workbench/shared";
import { cn } from "@/lib/cn";
import { isDesktop } from "@/lib/electron";
import { useRuntimeStore } from "@/lib/runtime";
import { useI18n } from "@/lib/i18n";
import { StatusPills } from "./StatusPills";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import logo from "@/assets/logo.webp";

interface Row {
  id: string;
  title: string;
  to: string;
  kind: "session" | "example";
}

export function Sidebar({ project }: { project: Project }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessions, hiddenExamples, favoriteSessions, toggleFavoriteSession, startDraft, deleteSession, hideExample, currentId, panes } = useRuntimeStore();
  const [query, setQuery] = useState("");

  const startNew = () => {
    startDraft();
    navigate("/live");
  };

  const sessionRows = sessions
    .filter((s) => !s.parentId)
    .map((s) => ({ id: s.id, title: s.title, to: `/live/${s.id}`, kind: "session" as const }));
  const exampleRows = project.sessions
    .filter((e) => !hiddenExamples.includes(e.id))
    .map((e) => ({ id: e.id, title: e.title, to: `/example/${e.id}`, kind: "example" as const }));
  const queryLower = query.trim().toLowerCase();
  const filteredSessions = sessionRows.filter((row) =>
    !queryLower || row.title.toLowerCase().includes(queryLower),
  );
  const filteredExamples = exampleRows.filter((row) =>
    !queryLower || row.title.toLowerCase().includes(queryLower),
  );
  const favoriteRows = filteredSessions.filter((row) => favoriteSessions.includes(row.id));
  const otherRows = filteredSessions.filter((row) => !favoriteSessions.includes(row.id));

  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  const confirmDelete = () => {
    const row = pendingDelete;
    setPendingDelete(null);
    if (!row) return;
    if (row.kind === "session") void deleteSession(row.id);
    else hideExample(row.id);
    if (location.pathname === row.to) navigate("/live");
  };

  const overlayTitlebar = isDesktop && navigator.userAgent.includes("Mac");

  const renderRow = (row: Row, selected: boolean) => (
    <div key={row.to} className="group relative">
      <NavLink
        to={row.to}
        data-row-id={row.id}
        className={cn(
          "flex items-center gap-2 rounded-input py-1 pl-2 pr-8 text-[13px] hover:bg-surface-2",
          selected ? "bg-surface-2 text-text" : "text-text/90",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            row.kind === "example" ? "bg-muted" : "bg-ok",
          )}
        />
        <span className="flex-1 truncate">{row.title}</span>
        {row.kind === "session" && panes?.[row.id]?.artifact && (
          <span className="ml-2 shrink-0 rounded-full bg-accent-600 px-1.5 py-0.5 text-[11px] text-white">Opened</span>
        )}
        {row.kind === "example" && (
          <span className="shrink-0 rounded-full bg-surface-2 px-1.5 text-[10px] uppercase tracking-wide text-muted ring-1 ring-border">
            {t("sidebar.example")}
          </span>
        )}
      </NavLink>
      {row.kind === "session" && (
        <button
          onClick={() => toggleFavoriteSession(row.id)}
          aria-label={favoriteSessions.includes(row.id) ? "Unfavorite session" : "Favorite session"}
          className="absolute right-7 top-1/2 hidden -translate-y-1/2 rounded p-1 text-muted hover:bg-surface-2 group-hover:block"
        >
          <Star size={13} className={favoriteSessions.includes(row.id) ? "text-accent" : "text-muted"} />
        </button>
      )}
      <button
        onClick={() => setPendingDelete(row)}
        aria-label={`Delete ${row.title}`}
        className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded p-1 text-muted hover:bg-border hover:text-error group-hover:block"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );

  // When the runtime's current session changes (e.g. via opening an artifact),
  // ensure the sidebar scrolls the corresponding row into view so the user
  // sees the active session.
  useEffect(() => {
    if (!currentId) return;
    try {
      const el = document.querySelector(`[data-row-id="${currentId}"]`);
      if (el && typeof (el as HTMLElement).scrollIntoView === "function") {
        (el as HTMLElement).scrollIntoView({ block: "center", behavior: "smooth" } as any);
      }
    } catch {
      /* ignore DOM errors in non-browser tests */
    }
  }, [currentId]);

  // Also navigate to the session route so the conversation + right pane
  // become visible when the runtime switches the active session.
  useEffect(() => {
    if (!currentId) return;
    try {
      navigate(`/live/${currentId}`);
    } catch {
      /* ignore in tests */
    }
  }, [currentId, navigate]);

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-border bg-surface">
      {overlayTitlebar && <div className="h-8 shrink-0 drag-region" />}
      <div className={cn("px-4 pb-3", overlayTitlebar ? "pt-1" : "pt-4")}>
        <div className="flex items-baseline gap-1.5">
          <img src={logo} alt="" className="h-[18px] w-auto self-center" />
          <div className="font-serif text-[17px] font-semibold leading-none tracking-tight text-text">
            Workbench
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted">Beta</span>
        </div>
      </div>

      <nav className="flex flex-col px-3">
        <NavRow icon={<Plus size={16} />} label={t("sidebar.new")} onClick={startNew} />
        <NavRow icon={<NotebookPen size={16} />} label={t("sidebar.notebooks")} onClick={() => navigate("/notebooks")} />
        <NavRow icon={<FolderTree size={16} />} label={t("sidebar.files")} onClick={() => navigate("/files")} />
        <NavRow icon={<Files size={16} />} label={t("sidebar.skills")} onClick={() => navigate("/skills")} />
      </nav>

      <div className="mt-4 px-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("sidebar.searchHistory")}
            className="w-full rounded-input border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-text outline-none placeholder:text-muted"
          />
        </div>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-3 pb-2">
        <div className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted">{t("sidebar.history")}</div>
        {filteredSessions.length === 0 && filteredExamples.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted">{t("sidebar.noResults")}</div>
        ) : null}
        {favoriteRows.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted">{t("sidebar.favorites")}</div>
            {favoriteRows.map((row) => renderRow(row, location.pathname === row.to || currentId === row.id))}
          </div>
        )}
        {otherRows.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted">{t("sidebar.recent")}</div>
            {otherRows.map((row) => renderRow(row, location.pathname === row.to || currentId === row.id))}
          </div>
        )}
        {filteredExamples.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted">{t("sidebar.examples")}</div>
            {filteredExamples.map((row) => renderRow(row, location.pathname === row.to || currentId === row.id))}
          </div>
        )}
      </div>

      <div className="border-t border-border px-3 py-3">
        <StatusPills />
        <button
          className="mt-2 flex items-center gap-2 rounded-input px-2 py-1 text-[13px] text-muted hover:bg-surface-2 hover:text-text"
          onClick={() => navigate("/settings")}
          aria-label="Settings"
        >
          <Settings size={15} />
          <span>{t("sidebar.settings")}</span>
        </button>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind === "session" ? t("sidebar.deleteSession") : t("sidebar.hideExample")}
          body={
            pendingDelete.kind === "session"
              ? `"${pendingDelete.title}"${t("sidebar.deleteSessionBody")}`
              : `"${pendingDelete.title}"${t("sidebar.hideExampleBody")}`
          }
          confirmLabel={pendingDelete.kind === "session" ? t("sidebar.delete") : t("sidebar.hide")}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </aside>
  );
}

function NavRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-input px-2 py-1 text-[13px] text-text hover:bg-surface-2"
    >
      <span className="text-muted">{icon}</span>
      <span>{label}</span>
    </button>
  );
}