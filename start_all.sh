#!/usr/bin/env bash
# ==============================================================================
# StackPilot - Start All Microservices
# ==============================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "============================================================"
echo " Starting StackPilot Architectural Recommender System"
echo "============================================================"

# 1. Ensure PostgreSQL is ready
echo "[1/4] Checking PostgreSQL..."
if ! pg_isready -q; then
    echo "Starting PostgreSQL via brew..."
    brew services start postgresql@16 || brew services start postgresql || true
fi
createdb stackpilot_db 2>/dev/null || true

# 2. Start ML Engine (FastAPI on Port 8000)
echo "[2/4] Starting Python ML Engine on :8000..."
cd "$PROJECT_ROOT/ml-engine"
if [ ! -d "venv" ]; then
    echo "Creating virtualenv..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
    ./venv/bin/python pipeline/train.py
fi

# Kill previous instance if running
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
nohup ./venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 > "$PROJECT_ROOT/ml-engine.log" 2>&1 &
echo "ML Engine started (PID: $!). Logs: ml-engine.log"

# 3. Start Core Backend (Spring Boot on Port 8080)
echo "[3/4] Starting Spring Boot Backend on :8080..."
cd "$PROJECT_ROOT/core-backend"
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
nohup ./mvnw spring-boot:run > "$PROJECT_ROOT/core-backend.log" 2>&1 &
echo "Core Backend started (PID: $!). Logs: core-backend.log"

# 4. Start Core Frontend (React + Vite on Port 5173)
echo "[4/4] Starting React Frontend on :5173..."
cd "$PROJECT_ROOT/core-frontend"
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$PROJECT_ROOT/core-frontend.log" 2>&1 &
echo "Frontend started (PID: $!). Logs: core-frontend.log"

echo "============================================================"
echo " StackPilot is running!"
echo " Web UI     : http://localhost:5173"
echo " Backend API: http://localhost:8080"
echo " ML Engine  : http://localhost:8000/docs"
echo "============================================================"
