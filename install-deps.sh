#!/usr/bin/env bash

set -e

echo "==> Installing dependencies for OpenBook Care"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install it from https://nodejs.org and re-run this script."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not available on PATH. It is usually installed together with Node.js."
  exit 1
fi

echo "Using Node: $(node -v)"
echo "Using npm:  $(npm -v)"

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: frontend directory not found at: $FRONTEND_DIR"
  exit 1
fi

cd "$FRONTEND_DIR"
echo "Working directory: $FRONTEND_DIR"

if [ -f "package-lock.json" ]; then
  echo "==> Running npm ci ..."
  npm ci
else
  echo "==> Running npm install ..."
  npm install
fi

echo "✅ Dependencies installed successfully."

