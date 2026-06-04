#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Resolve the repository root directory (absolute path)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "=================================================="
echo "             Checking Codebase Formatting         "
echo "=================================================="

# 1. Check Backend Formatting
echo ""
echo ">>> [1/2] Checking Backend (black --check)..."
cd "$REPO_ROOT/backend"
black --check .

# 2. Check Frontend Formatting
echo ""
echo ">>> [2/2] Checking Frontend (prettier --check)..."
cd "$REPO_ROOT/frontend"
npm run format:check

echo ""
echo "=================================================="
echo "            All files are correctly formatted!    "
echo "=================================================="
