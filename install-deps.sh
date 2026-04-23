#!/usr/bin/env bash

set -e

echo "==> Installing dependencies for OpenBook Care"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"
BACKEND_VENV_DIR="$BACKEND_DIR/.venv"

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

if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
else
  echo "Error: Python is not installed. Please install Python 3.9+ and re-run this script."
  exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
  echo "Error: backend directory not found at: $BACKEND_DIR"
  exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: frontend directory not found at: $FRONTEND_DIR"
  exit 1
fi

echo "Using Python: $($PYTHON_CMD --version)"
echo "==> Installing backend dependencies..."
cd "$BACKEND_DIR"
echo "Working directory: $BACKEND_DIR"

if [ ! -d "$BACKEND_VENV_DIR" ]; then
  echo "==> Creating backend virtual environment at $BACKEND_VENV_DIR ..."
  $PYTHON_CMD -m venv "$BACKEND_VENV_DIR"
fi

VENV_PYTHON="$BACKEND_VENV_DIR/bin/python"
if [ ! -x "$VENV_PYTHON" ]; then
  echo "Error: virtualenv python not found at $VENV_PYTHON"
  exit 1
fi

$VENV_PYTHON -m pip install --upgrade pip
$VENV_PYTHON -m pip install -r requirements.txt

echo "==> Installing frontend dependencies..."
cd "$FRONTEND_DIR"
echo "Working directory: $FRONTEND_DIR"

if [ -f "package-lock.json" ]; then
  echo "==> Running npm ci ..."
  npm ci
else
  echo "==> Running npm install ..."
  npm install
fi

echo "✅ All dependencies installed successfully."

