#!/usr/bin/env bash
# Smoke-test production build: SPA fallback must serve index.html for client routes.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
npm run build
PORT="${SMOKE_PORT:-51987}"
SERVE_LOG="${SMOKE_SERVE_LOG:-/tmp/openbook-smoke-serve.log}"
rm -f "$SERVE_LOG"
npx --yes serve@14.2.4 dist -s -l "$PORT" >"$SERVE_LOG" 2>&1 &
SERVE_PID=$!
trap 'kill "$SERVE_PID" 2>/dev/null || true' EXIT

READY=
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:${PORT}/"; then
    READY=1
    break
  fi
  sleep 0.25
done

if [[ -z "${READY:-}" ]]; then
  echo "smoke FAILED: static server never became ready on port ${PORT}"
  echo "--- serve log (${SERVE_LOG}) ---"
  cat "$SERVE_LOG" || true
  exit 1
fi

ROUTES=(/ /cost-results /compare-plans /ai-assistant /simulate-usage)
for path in "${ROUTES[@]}"; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${path}")"
  if [[ "$code" != "200" ]]; then
    echo "smoke FAILED: GET ${path} -> HTTP ${code}"
    echo "--- serve log (${SERVE_LOG}) ---"
    cat "$SERVE_LOG" || true
    exit 1
  fi
done
echo "smoke OK (SPA routes return HTTP 200)"
