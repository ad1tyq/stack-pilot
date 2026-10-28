#!/usr/bin/env bash
# ==============================================================================
# StackPilot - Stop All Microservices
# ==============================================================================
echo "Stopping StackPilot microservices..."

# Stop Port 5173 (Frontend)
PID_5173=$(lsof -ti:5173 || true)
if [ -n "$PID_5173" ]; then
    echo "Stopping Frontend (:5173)..."
    kill -9 $PID_5173 2>/dev/null || true
fi

# Stop Port 8080 (Spring Boot)
PID_8080=$(lsof -ti:8080 || true)
if [ -n "$PID_8080" ]; then
    echo "Stopping Spring Boot (:8080)..."
    kill -9 $PID_8080 2>/dev/null || true
fi

# Stop Port 8000 (Python FastAPI)
PID_8000=$(lsof -ti:8000 || true)
if [ -n "$PID_8000" ]; then
    echo "Stopping ML Engine (:8000)..."
    kill -9 $PID_8000 2>/dev/null || true
fi

echo "All StackPilot services stopped."
