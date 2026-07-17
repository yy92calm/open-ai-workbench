import { create } from "zustand";
import { loadLocale, persistLocale, type Locale } from "./i18n";

export type Theme = "light" | "dark";
export type AgentRuntimeKind = "opencode" | "claude-code";

const THEME_KEY = "workbench.theme";
const RUNTIME_KIND_KEY = "workbench.agentRuntimeKind";
const SIDEBAR_KEY = "workbench.sidebarWidth";
const SIDEBAR_COLLAPSED_KEY = "workbench.sidebarCollapsed";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function initialSidebarWidth(): number {
  if (typeof window === "undefined") return 200;
  const saved = window.localStorage.getItem(SIDEBAR_KEY);
  const n = saved ? Number(saved) : NaN;
  return Number.isFinite(n) ? Math.max(160, Math.min(360, n)) : 200;
}

function initialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

function initialRuntimeKind(): AgentRuntimeKind {
  if (typeof window === "undefined") return "opencode";
  const saved = window.localStorage.getItem(RUNTIME_KIND_KEY);
  return saved === "claude-code" ? "claude-code" : "opencode";
}

interface UiState {
  theme: Theme;
  locale: Locale;
  /** Which agent runtime the app connects to (opencode / claude-code). */
  agentRuntimeKind: AgentRuntimeKind;
  inspectorOpen: boolean;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  /** One-shot text placed into the composer by another surface (e.g. the
   *  provenance Reproduce action) - consumed on the next composer render. */
  composerDraft: string | null;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  setAgentRuntimeKind: (kind: AgentRuntimeKind) => void;
  setInspectorOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setPaletteOpen: (open: boolean) => void;
  setComposerDraft: (draft: string | null) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme(),
  locale: loadLocale(),
  agentRuntimeKind: initialRuntimeKind(),
  inspectorOpen: true,
  sidebarWidth: initialSidebarWidth(),
  sidebarCollapsed: initialSidebarCollapsed(),
  paletteOpen: false,
  setTheme: (theme) => {
    if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
  setLocale: (locale) => {
    persistLocale(locale);
    set({ locale });
  },
  toggleTheme: () => get().setTheme(get().theme === "light" ? "dark" : "light"),
  setAgentRuntimeKind: (agentRuntimeKind) => {
    if (typeof window !== "undefined") window.localStorage.setItem(RUNTIME_KIND_KEY, agentRuntimeKind);
    set({ agentRuntimeKind });
  },
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  setSidebarWidth: (sidebarWidth) => {
    const clamped = Math.max(160, Math.min(360, sidebarWidth));
    if (typeof window !== "undefined") window.localStorage.setItem(SIDEBAR_KEY, String(clamped));
    set({ sidebarWidth: clamped });
  },
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    if (typeof window !== "undefined") window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    set({ sidebarCollapsed: next });
  },
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  composerDraft: null,
  setComposerDraft: (composerDraft) => set({ composerDraft }),
}));
