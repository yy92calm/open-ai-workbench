import { Shield, ShieldAlert, Zap } from "lucide-react";
import type { PermissionMode } from "@workbench/sdk";
import { cn } from "@/lib/cn";

const MODES: { value: PermissionMode; label: string; icon: React.ReactNode }[] = [
  { value: "review", label: "审核", icon: <ShieldAlert size={12} /> },
  { value: "auto", label: "自动", icon: <Shield size={12} /> },
  { value: "yolo", label: "YOLO", icon: <Zap size={12} /> },
];

export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: PermissionMode;
  onChange: (mode: PermissionMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-input bg-surface-2 p-0.5">
      {MODES.map((m) => (
        <button
          key={m.value}
          className={cn(
            "flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium transition-colors",
            mode === m.value
              ? m.value === "yolo"
                ? "bg-warn/20 text-warn"
                : m.value === "review"
                  ? "bg-error/15 text-error"
                  : "bg-accent/15 text-accent"
              : "text-muted hover:text-text",
          )}
          onClick={() => onChange(m.value)}
          title={
            m.value === "review"
              ? "每次操作需确认"
              : m.value === "yolo"
                ? "全自动，无需确认"
                : "自动执行常规操作"
          }
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  );
}
