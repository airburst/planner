#!/usr/bin/env bash
# Capture Overview/Assets/Expenses/Strategy screenshots from the running app
# into docs/images. Uses a one-shot screenshot mode in electron.js (gated by
# PLANNER_SCREENSHOT_MODE=1). Builds the renderer + main bundles, serves the
# built renderer over `vite preview` so SPA routing works, then runs Electron
# pointed at it.

set -euo pipefail

cd "$(dirname "$0")/.."

PORT=4173

cleanup() {
  if [[ -n "${PREVIEW_PID:-}" ]]; then
    kill "$PREVIEW_PID" 2>/dev/null || true
    wait "$PREVIEW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "[screenshots] rebuilding better-sqlite3 for Electron's ABI..."
npx --yes electron-rebuild -f -w better-sqlite3 >/dev/null

echo "[screenshots] building renderer..."
bun run vite build

echo "[screenshots] building main-process bundles (engine, db)..."
bun run vite build --config vite.main.config.ts

echo "[screenshots] starting vite preview on :$PORT..."
# --host 127.0.0.1 forces IPv4 binding (vite's default is IPv6-only ::1).
bunx vite preview --host 127.0.0.1 --port "$PORT" --strictPort \
  >/tmp/planner-screenshots-preview.log 2>&1 &
PREVIEW_PID=$!

# Wait for the preview server to come up.
for _ in $(seq 1 30); do
  if curl -fs "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

echo "[screenshots] launching Electron in screenshot mode..."
PLANNER_SCREENSHOT_MODE=1 \
PLANNER_SCREENSHOT_URL="http://127.0.0.1:$PORT/" \
  npx --yes electron .

echo "[screenshots] done. Output:"
ls -1 docs/images/ 2>/dev/null || true
