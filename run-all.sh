#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_PYTHON="$BACKEND_DIR/.venv/bin/python"

echo "==> OpenBook Care launcher"

if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: backend/ or frontend/ directory not found."
  exit 1
fi

if [ ! -x "$BACKEND_PYTHON" ]; then
  echo "Backend virtual environment not found."
  echo "Run: bash install-deps.sh"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not available on PATH."
  exit 1
fi

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "==> Starting backend on http://localhost:8000"
cd "$BACKEND_DIR"
"$BACKEND_PYTHON" -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

echo "==> Starting frontend on http://localhost:5173"
cd "$FRONTEND_DIR"
npm run dev
