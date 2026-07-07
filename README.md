# Workbench

**A config-driven OpenCode desktop shell.** Drop a complete `.opencode/` profile
into `app-config/`, run `tauri build`, and you get a dedicated desktop app for
that configuration — providers, model, skills, agents, commands, MCP, and
permissions all decided by the bundled profile, not configurable at runtime.

Built on [Tauri 2](https://tauri.app) + React + TypeScript, with
[OpenCode](https://opencode.ai) as the bundled agent runtime (single-binary
sidecar, pinned and managed by the app).

## What it is

A reusable desktop shell around the OpenCode agent runtime. The app itself
ships no model/provider/skill configuration UI — everything comes from the
packager's `.opencode/` profile. End users get a focused, locked-down app; the
packager decides what it can do.

- **Config-driven** — `app-config/.opencode/` is bundled as a Tauri resource and
  deployed to the app's private OpenCode config dir on every sidecar start.
- **Local-first** — workspace files, code execution, session history, and
  provenance stay on the machine; only conversation turns reach the model
  provider.
- **Reproducible artifacts** — every agent write appends a version record to
  `.workbench/provenance.jsonl` with its code, environment, and originating
  conversation.
- **Manual approval by default** — dangerous shell commands (deletion, installs,
  remote, privilege) prompt before running. The approval mode is fixed by the
  bundled profile and not switchable to "full" from the UI.
- **Local Python/R kernel + Jupyter** — persistent per-notebook kernels; the
  agent runs code in the workspace.

## Build a dedicated app

1. Put your OpenCode configuration in `app-config/.opencode/` — `opencode.json`
   (providers, model, permission), `skills/`, `agents/`, `commands/`. See
   [`app-config/.opencode/README.md`](./app-config/.opencode/README.md).
2. Fetch the pinned sidecars (kept out of git):

   ```bash
   pnpm install
   bash scripts/dev/fetch-opencode.sh   # the OpenCode agent runtime
   bash scripts/dev/fetch-uv.sh         # uv, for isolated Python/Jupyter envs
   ```

3. Build an installer:

   ```bash
   pnpm --filter @workbench/desktop tauri build
   ```

The resulting `.dmg` / `.exe` / `.msi` / `.deb` / `.rpm` is a dedicated desktop
app for your `.opencode` profile.

## Brand it

The shipped name is the placeholder **Workbench** (`com.workbench.app`). To
rebrand for your product, change `productName` / `identifier` / window `title`
in `apps/desktop/src-tauri/tauri.conf.json`, the app icon in
`apps/desktop/src-tauri/icons/`, the sidebar label in
`apps/desktop/src/components/sidebar/Sidebar.tsx`, and the `<title>` in
`apps/desktop/index.html`.

## Repository layout

| Path | Purpose |
| --- | --- |
| `app-config/.opencode/` | The OpenCode profile the app bundles and deploys |
| `apps/desktop/` | Tauri 2 + React shell (`src/` frontend, `src-tauri/` Rust) |
| `packages/sdk/` | `OpenCodeClient` SDK wrapper (isolates the UI from the runtime) |
| `packages/shared/` | Shared domain types and the chart design system |
| `runtime/kernel/` | Python and R kernel bridges |
| `scripts/dev/` | Sidecar fetchers (opencode, uv) |
| `.github/workflows/build.yml` | CI: builds mac/Windows/Linux installers on `v*` tags |

## Safety defaults

- The agent may only access the current workspace.
- Command execution, file deletion, dependency installs, and remote connections
  require approval (manual approval mode by default — never ship `full`).
- Provider keys live in the app-private config dir (owner-only); never in
  provenance, logs, crash reports, git, or exports.

## License

[MIT](./LICENSE). Bundled third-party skills and connectors carry their own
licenses.

> This is beta tooling. Verify outputs before relying on them.
