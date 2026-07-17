import { create } from "zustand";
import { loadLocale, persistLocale, type Locale } from "./i18n";

export type Theme = "light" | "dark";
export type AgentRuntimeKind = "opencode" | "claude-code";

const THEME_KEY = "workbench.theme";
const RUNTIME_KIND_KEY = "workbench.agentRuntimeKind";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
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
  setPaletteOpen: (open: boolean) => void;
  setComposerDraft: (draft: string | null) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme(),
  locale: loadLocale(),
  agentRuntimeKind: initialRuntimeKind(),
  inspectorOpen: true,
  sidebarCollapsed: false,
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
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  composerDraft: null,
  setComposerDraft: (composerDraft) => set({ composerDraft }),
}));
