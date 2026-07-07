#!/usr/bin/env bash
# Build the Workbench desktop app for a specific channel.
# Usage: ./scripts/dev/build-channel.sh <dev|beta|prod>
set -euo pipefail

CHANNEL="${1:-dev}"

case "$CHANNEL" in
  dev)
    export WORKBENCH_CHANNEL="dev"
    ;;
  beta)
    export WORKBENCH_CHANNEL="beta"
    export TAURI_CONFIG='{"productName":"Workbench Beta","identifier":"com.workbench.app.beta","app":{"windows":[{"title":"Workbench Beta"}]}}'
    ;;
  prod)
    export WORKBENCH_CHANNEL="prod"
    export TAURI_CONFIG='{"productName":"Workbench","identifier":"com.workbench.app","app":{"windows":[{"title":"Workbench"}]}}'
    ;;
  *)
    echo "Unknown channel: $CHANNEL  (use dev|beta|prod)" >&2
    exit 1
    ;;
esac

echo "Building $CHANNEL channel..."
pnpm --filter @workbench/desktop tauri build
