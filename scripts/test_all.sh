#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Resolve the repository root directory (absolute path)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "=================================================="
echo "             Running All Project Tests            "
echo "=================================================="

# 1. Run Backend Tests
echo ""
echo ">>> [1/2] Running Backend Tests (pytest)..."
cd "$REPO_ROOT/backend"
PYTHONPATH=. pytest

# 2. Run Frontend Tests
echo ""
echo ">>> [2/2] Running Frontend Tests (jest)..."
cd "$REPO_ROOT/frontend"
npm run test

echo ""
echo "=================================================="
echo "          All tests passed successfully!          "
echo "=================================================="
