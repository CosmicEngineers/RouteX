#!/bin/bash

# RouteX - Complete Startup Script
# Starts backend (FastAPI + Celery), Redis, and frontend servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=8000
FRONTEND_PORT=3000
REDIS_PORT=6379

# PID tracking
BACKEND_PID=""
FRONTEND_PID=""
REDIS_PID=""
CELERY_WORKER_PID=""
CELERY_BEAT_PID=""

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}🚢 Starting RouteX - HPCL Coastal Tanker Fleet Optimizer${NC}"
echo "=========================================================="

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"
    
    # Kill processes by PID
    [ ! -z "$CELERY_BEAT_PID" ] && kill $CELERY_BEAT_PID 2>/dev/null || true
    [ ! -z "$CELERY_WORKER_PID" ] && kill $CELERY_WORKER_PID 2>/dev/null || true
    [ ! -z "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
    [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
    [ ! -z "$REDIS_PID" ] && kill $REDIS_PID 2>/dev/null || true
    
    # Kill any remaining processes
    pkill -f "celery.*worker" 2>/dev/null || true
    pkill -f "celery.*beat" 2>/dev/null || true
    pkill -f "uvicorn.*routex" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "redis-server.*$REDIS_PORT" 2>/dev/null || true
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap signals
trap cleanup INT TERM EXIT

# Check system requirements
echo ""
echo -e "${BLUE}🔍 Checking system requirements...${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required but not found${NC}"
    echo "   Please install Python 3.9 or higher"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✅ ${PYTHON_VERSION}${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not found${NC}"
    echo "   Please install Node.js 18 or higher"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION}${NC}"

# Check Redis
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis not found - installing via Homebrew...${NC}"
    if command -v brew &> /dev/null; then
        brew install redis
    else
        echo -e "${RED}❌ Homebrew not found. Please install Redis manually:${NC}"
        echo "   brew install redis"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Redis available${NC}"

# Backend Setup
echo ""
echo -e "${BLUE}📦 Setting up Backend...${NC}"
cd "$PROJECT_ROOT"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
if [ ! -f "venv/.dependencies_installed" ] || [ backend/requirements.txt -nt venv/.dependencies_installed ]; then
    echo "📦 Installing backend dependencies..."
    pip install --upgrade pip --quiet
    pip install -r backend/requirements.txt --quiet
    touch venv/.dependencies_installed
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Backend dependencies already installed${NC}"
fi

# Frontend Setup
echo ""
echo -e "${BLUE}📦 Setting up Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"

# Install frontend dependencies
if [ ! -d "node_modules" ] || [ package.json -nt node_modules/.package-lock.json ]; then
    echo "📦 Installing frontend dependencies..."
    npm install --silent
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

cd "$PROJECT_ROOT"

# Check if ports are available
echo ""
echo -e "${BLUE}🔍 Checking ports...${NC}"

check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${RED}❌ Port $port is already in use (required for $service)${NC}"
        echo "   Kill the process using: lsof -ti:$port | xargs kill -9"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available ($service)${NC}"
        return 0
    fi
}

check_port $BACKEND_PORT "Backend API" || exit 1
check_port $FRONTEND_PORT "Frontend" || exit 1
check_port $REDIS_PORT "Redis" || exit 1

# Start services
echo ""
echo -e "${BLUE}🚀 Starting services...${NC}"
echo ""

# 1. Start Redis
echo -e "${BLUE}▶️  Starting Redis on port $REDIS_PORT...${NC}"
redis-server --port $REDIS_PORT --daemonize yes --logfile "$PROJECT_ROOT/redis.log"
sleep 1

# Verify Redis is running
if ! redis-cli -p $REDIS_PORT ping > /dev/null 2>&1; then
    echo -e "${RED}❌ Redis failed to start${NC}"
    exit 1
fi
REDIS_PID=$(pgrep -f "redis-server.*$REDIS_PORT")
echo -e "${GREEN}✅ Redis started (PID: $REDIS_PID)${NC}"

# 2. Start Backend API
echo -e "${BLUE}▶️  Starting Backend API on port $BACKEND_PORT...${NC}"
cd "$PROJECT_ROOT"
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

# Verify backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start. Check backend.log${NC}"
    cat backend.log
    exit 1
fi
echo -e "${GREEN}✅ Backend API started (PID: $BACKEND_PID)${NC}"

# 3. Start Celery Worker (optional - for background tasks)
echo -e "${BLUE}▶️  Starting Celery Worker...${NC}"
cd "$PROJECT_ROOT/backend"
celery -A app.core.celery_app worker --loglevel=info --logfile="$PROJECT_ROOT/celery_worker.log" > /dev/null 2>&1 &
CELERY_WORKER_PID=$!
sleep 3

# Verify Celery worker is running
if kill -0 $CELERY_WORKER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Celery Worker started (PID: $CELERY_WORKER_PID)${NC}"
    
    # 4. Start Celery Beat scheduler
    echo -e "${BLUE}▶️  Starting Celery Beat scheduler...${NC}"
    celery -A app.core.celery_app beat --loglevel=info --logfile="$PROJECT_ROOT/celery_beat.log" > /dev/null 2>&1 &
    CELERY_BEAT_PID=$!
    sleep 2
    
    # Verify Celery beat is running
    if kill -0 $CELERY_BEAT_PID 2>/dev/null; then
        echo -e "${GREEN}✅ Celery Beat started (PID: $CELERY_BEAT_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Celery Beat failed to start (non-critical, check celery_beat.log)${NC}"
        CELERY_BEAT_PID=""
    fi
else
    echo -e "${YELLOW}⚠️  Celery Worker failed to start (non-critical, background tasks disabled)${NC}"
    echo -e "${YELLOW}   This is normal - the API will work without Celery${NC}"
    CELERY_WORKER_PID=""
    CELERY_BEAT_PID=""
fi

# 5. Start Frontend
echo -e "${BLUE}▶️  Starting Frontend on port $FRONTEND_PORT...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!
sleep 5

# Verify frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Frontend failed to start. Check frontend.log${NC}"
    cat "$PROJECT_ROOT/frontend.log"
    exit 1
fi
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

cd "$PROJECT_ROOT"

# Display success message
echo ""
echo "=========================================================="
echo -e "${GREEN}✅ RouteX is fully operational!${NC}"
echo "=========================================================="
echo ""
echo -e "${BLUE}📊 Service URLs:${NC}"
echo "   🌐 Frontend:        http://localhost:$FRONTEND_PORT"
echo "   📚 Backend API:     http://localhost:$BACKEND_PORT"
echo "   📖 API Docs:        http://localhost:$BACKEND_PORT/docs"
echo "   📖 ReDoc:           http://localhost:$BACKEND_PORT/redoc"
echo "   💊 Health Check:    http://localhost:$BACKEND_PORT/health"
echo ""
echo -e "${BLUE}📝 Log Files:${NC}"
echo "   Backend:     $PROJECT_ROOT/backend.log"
echo "   Frontend:    $PROJECT_ROOT/frontend.log"
echo "   Redis:       $PROJECT_ROOT/redis.log"
echo "   Celery:      $PROJECT_ROOT/celery_worker.log"
echo "   Beat:        $PROJECT_ROOT/celery_beat.log"
echo ""
echo -e "${BLUE}🔧 Running Services:${NC}"
echo "   Redis:          PID $REDIS_PID"
echo "   Backend API:    PID $BACKEND_PID"
if [ ! -z "$CELERY_WORKER_PID" ]; then
    echo "   Celery Worker:  PID $CELERY_WORKER_PID"
fi
if [ ! -z "$CELERY_BEAT_PID" ]; then
    echo "   Celery Beat:    PID $CELERY_BEAT_PID"
fi
echo "   Frontend:       PID $FRONTEND_PID"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo "=========================================================="

# Monitor processes and restart if they crash
while true; do
    # Check if any critical process died
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}❌ Backend crashed! Check backend.log${NC}"
        cleanup
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}❌ Frontend crashed! Check frontend.log${NC}"
        cleanup
    fi
    
    if ! redis-cli -p $REDIS_PORT ping > /dev/null 2>&1; then
        echo -e "${RED}❌ Redis crashed! Check redis.log${NC}"
        cleanup
    fi
    
    # Optional: Check Celery worker if it's running
    if [ ! -z "$CELERY_WORKER_PID" ] && ! kill -0 $CELERY_WORKER_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Celery worker stopped (non-critical)${NC}"
        CELERY_WORKER_PID=""
    fi
    
    sleep 5
done
