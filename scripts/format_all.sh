#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Resolve the repository root directory (absolute path)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "=================================================="
echo "             Formatting Entire Codebase           "
echo "=================================================="

# 1. Format Backend Python Code
echo ""
echo ">>> [1/2] Formatting Backend (black)..."
cd "$REPO_ROOT/backend"
black .

# 2. Format Frontend TypeScript Code
echo ""
echo ">>> [2/2] Formatting Frontend (prettier)..."
cd "$REPO_ROOT/frontend"
npm run format

echo ""
echo "=================================================="
echo "           Codebase formatted successfully!       "
echo "=================================================="
