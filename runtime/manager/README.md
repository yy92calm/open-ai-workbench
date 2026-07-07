# runtime/manager

The local Runtime Manager (documented; the implementation lives in
`apps/desktop/src-tauri/src/runtime.rs`). Keeps the desktop installer light.

Responsibilities:

- Detect OpenCode, Python / uv, Node, Git.
- Create and manage the workspace and isolated environments.
- Start / supervise the bundled OpenCode sidecar (and the Jupyter environment).
- Manage ports; monitor runtime health.
- Deploy the bundled `.opencode/` profile to the app-private config dir on every
  sidecar start.
- Write `provenance.jsonl`; collect logs.

## Runtime directory (per OS)

```text
macOS:   ~/Library/Application Support/com.workbench.app/runtime/
Windows: %APPDATA%/com.workbench.app/runtime/
Linux:   ~/.local/share/com.workbench.app/runtime/
  xdg-config/opencode/  xdg-data/  xdg-cache/  xdg-state/
```

## Startup order

UI starts → Runtime Manager checks dependencies → deploys the bundled
`.opencode/` profile → starts the OpenCode sidecar → connects → ready. A failed
OpenCode connection must not block the UI.
