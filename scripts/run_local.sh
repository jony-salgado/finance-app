#!/bin/bash

# FinançasApp Local Run Script
# This script starts both the FastAPI backend and the Angular frontend.

# Function to handle cleanup on exit (Ctrl+C)
cleanup() {
    echo ""
    echo "Stopping servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "Backend stopped."
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "Frontend stopped."
    fi
    exit
}

# Trap interrupt signals
trap cleanup SIGINT SIGTERM

echo "======================================"
echo "      Starting FinançasApp          "
echo "======================================"

# 1. Start Backend
echo ">>> Starting Backend (FastAPI)..."
cd backend
# Install dependencies
pip install -r requirements.txt --quiet
# Run uvicorn in background
# Use nohup or similar to ensure it stays in background properly
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "Backend starting on http://localhost:8000 (PID: $BACKEND_PID)"
echo "--------------------------------------"

# 2. Start Frontend
echo ">>> Starting Frontend (Angular)..."
cd frontend
# Disable Angular CLI Analytics prompt
export NG_CLI_ANALYTICS=false
# Use local node_modules in PATH
export PATH="./node_modules/.bin:$PATH"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies (this may take a while)..."
    npm install --no-audit --no-fund --quiet
fi

# Start frontend (this will block the terminal)
npm start &
FRONTEND_PID=$!

echo "Frontend starting on http://localhost:4200 (PID: $FRONTEND_PID)"
echo "Watch the logs below. It may take a minute to build..."
echo "--------------------------------------"

# Keep the script running to catch logs and wait for cleanup
wait
