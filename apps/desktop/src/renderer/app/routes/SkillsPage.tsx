import { useState, useEffect } from "react";
import { Bot, Puzzle } from "lucide-react";
import { useRuntimeStore } from "@/lib/runtime";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Tab = "agents" | "skills";

export function SkillsPage() {
  const { t } = useI18n();
  const { skills, agents, status, loadCatalog } = useRuntimeStore();
  const connected = status === "ready";
  const [tab, setTab] = useState<Tab>("agents");

  useEffect(() => {
    if (connected) void loadCatalog();
  }, [connected, loadCatalog]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8">
        <h1 className="font-serif text-xl text-text">{t("skills.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("skills.subtitle")}</p>

        {connected ? (
          <>
            <div className="mt-6 flex gap-1 rounded-card border border-border bg-surface-2 p-1">
              <TabButton active={tab === "agents"} onClick={() => setTab("agents")}>
                <Bot size={14} /> Agents ({agents.length})
              </TabButton>
              <TabButton active={tab === "skills"} onClick={() => setTab("skills")}>
                <Puzzle size={14} /> Skills ({skills.length})
              </TabButton>
            </div>

            {tab === "agents" && (
              agents.length === 0 ? (
                <Empty>{t("skills.noAgents")}</Empty>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {agents.map((a) => (
                    <Card
                      key={a.name}
                      name={a.name}
                      desc={a.description}
                      tags={a.mode ? [a.mode] : []}
                    />
                  ))}
                </div>
              )
            )}

            {tab === "skills" && (
              skills.length === 0 ? (
                <Empty>{t("skills.noSkills")}</Empty>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {skills.map((s) => (
                    <Card
                      key={s.name}
                      name={s.name}
                      desc={s.description}
                      tags={sourceOf(s.location, t) ? [sourceOf(s.location, t)!] : []}
                    />
                  ))}
                </div>
              )
            )}
          </>
        ) : (
          <div className="mt-6 rounded-card border border-border bg-surface p-5 text-sm text-muted">
            {t("skills.disconnected")}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-4 py-1.5 text-[13px] transition-colors",
        active ? "bg-surface text-text shadow-card" : "text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

function Card({ name, desc, tags }: { name: string; desc: string; tags: string[] }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col rounded-card border border-border bg-surface p-4">
      <div className="mb-1 text-sm font-medium text-text">{name}</div>
      <div className="min-h-[2.5rem] text-xs leading-relaxed text-muted line-clamp-2">
        {desc || t("skills.noDesc")}
      </div>
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted ring-1 ring-border"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function sourceOf(location?: string, t?: (key: string) => string): string | undefined {
  if (!location) return undefined;
  if (location.includes("/builtin/")) return t?.("skills.builtin") ?? "built-in";
  if (location.includes("/.opencode/")) return t?.("skills.project") ?? "project";
  return t?.("skills.user") ?? "user";
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 text-center text-sm text-muted">{children}</div>;
}