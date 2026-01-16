#!/bin/bash

# RouteX - Single Startup Script
# Starts both backend and frontend servers

set -e

echo "🚢 Starting RouteX - HPCL Coastal Tanker Fleet Optimizer"
echo "=========================================================="

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found"
    exit 1
fi

echo "✅ Python $(python3 --version) detected"

# Backend Setup
echo ""
echo "📦 Setting up Backend..."
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
if [ ! -f "venv/.dependencies_installed" ]; then
    echo "📦 Installing backend dependencies..."
    pip install --upgrade pip > /dev/null
    pip install -r backend/requirements.txt
    touch venv/.dependencies_installed
    echo "✅ Backend dependencies installed"
else
    echo "✅ Backend dependencies already installed"
fi

# Frontend Setup
echo ""
echo "📦 Setting up Frontend..."
cd frontend

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo "✅ Frontend dependencies installed"
else
    echo "✅ Frontend dependencies already installed"
fi

cd ..

# Start servers
echo ""
echo "🚀 Starting servers..."
echo ""

# Start backend in background
echo "▶️  Starting Backend API (http://localhost:8000)"
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload > /dev/null 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend in background
echo "▶️  Starting Frontend (http://localhost:3000)"
cd frontend
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 5

echo ""
echo "=========================================================="
echo "✅ RouteX is running!"
echo ""
echo "🌐 Frontend:        http://localhost:3000"
echo "📚 Backend API:     http://localhost:8000"
echo "📖 API Docs:        http://localhost:8000/docs"
echo "💊 Health Check:    http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=========================================================="

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "uvicorn" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    echo "✅ Servers stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for processes
wait
