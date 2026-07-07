# Workbench (desktop)

Brand name: **Workbench** — a config-driven OpenCode desktop shell. Drop a
complete `.opencode/` profile into `app-config/`, build, and you get a dedicated
desktop app for that configuration. (Bundle identifier `com.workbench.app`;
internal `@workbench/*` package names.)

Project rules and working context for AI agents (Claude Code, Cursor, Codex,
etc.). `CLAUDE.md` is a symlink to this file — edit only `AGENTS.md`.

## Design principles

Keep it **simple, explicit, clear, complete**.

- **Simple** — no over-engineering; if not necessary, do not add entities.
- **Explicit** — no ambiguity; no bugs.
- **Clear** — understandable at a glance.
- **Complete** — cover the key points; prioritize safety.

## What this project is

A reusable, local-first desktop shell around the bundled OpenCode agent
runtime. The app ships no runtime configuration UI — providers, model, skills,
agents, commands, MCP, and permissions are all decided by the packager's
`app-config/.opencode/` profile and deployed to the app's private OpenCode
config dir on every sidecar start.

Recommended stack: **Tauri 2 + React + TypeScript + Vite**, Tailwind + Radix UI,
**OpenCode** as the agent runtime (bundled single-binary sidecar; HTTP + SSE
API), local workspace + JSONL provenance.

## Repository map

- `app-config/.opencode/` — the OpenCode profile the app bundles (packager-owned).
- `apps/desktop/` — Tauri + React desktop shell (`src/` frontend, `src-tauri/` Rust).
- `packages/` — `ui` (placeholder), `shared`, `sdk` (the `OpenCodeClient` wrapper).
- `runtime/` — `kernel` (Python/R bridges), `manager`, `mcp`.
- `scripts/` — release and dev scripts.

## Architecture guardrails

- The UI never calls OpenCode directly — it goes through `packages/sdk`
  (`OpenCodeClient`). Pin the OpenCode version (see
  `scripts/dev/fetch-opencode.sh`) and bundle it as a sidecar.
- Keep the frontend, desktop shell, and agent runtime decoupled.
- Skills, MCP servers, and model providers are pluggable through the `.opencode`
  profile — the app itself adds none at runtime.

## Safety defaults (non-negotiable for the desktop)

- The agent may only access the current workspace.
- Command execution, file deletion, dependency install, and remote connections
  require approval (manual approval mode by default — never ship `full`).
- API keys go to the app-private config dir; never into provenance, logs, crash
  reports, git, or exported projects.

## Working conventions

- Default working language for discussion is Chinese; **all project files and
  code are in English** (this is a pure-English project).
- One progress file: `PROGRESS.md`. Append one line per real milestone,
  `YYYY-MM-DD HH:MM` + a one-sentence conclusion, newest on top. Results and
  blockers only.
- Avoid adding new Markdown docs unless requested — too many docs become debt.
- Prefer minimal, verifiable changes; every step should produce a checkable result.
- Do not write inferences as verified facts; tie conclusions to code or data.
