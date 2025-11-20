#!/bin/bash

# HPCL Coastal Tanker Optimizer - Development Startup Script
# Starts all required services for local development

echo "🚢 Starting HPCL Coastal Tanker Fleet Optimizer..."
echo "================================================"

# Check if Python 3.11+ is available
python_version=$(python3 --version 2>&1 | grep -o "3\.[0-9]\+")
if [ -z "$python_version" ]; then
    echo "❌ Python 3.11+ is required"
    exit 1
fi

echo "✅ Python $python_version detected"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "🔧 Activating virtual environment..."
    source venv/bin/activate
    echo "✅ Virtual environment activated"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt
echo "✅ Dependencies installed"

# Start Redis (required for Celery)
echo "🔄 Starting Redis server..."
if command -v redis-server &> /dev/null; then
    redis-server --daemonize yes --port 6379
    echo "✅ Redis server started on port 6379"
else
    echo "⚠️  Redis not found. Install Redis or use Docker:"
    echo "   docker run -d -p 6379:6379 redis:alpine"
fi

# Start MongoDB (if not running)
echo "🔄 Checking MongoDB..."
if ! pgrep mongod > /dev/null; then
    echo "⚠️  MongoDB not detected. Start MongoDB or use Docker:"
    echo "   docker run -d -p 27017:27017 mongo:latest"
else
    echo "✅ MongoDB is running"
fi

# Generate sample data
echo "📊 Generating HPCL sample data..."
python -c "
import sys
sys.path.append('.')
from backend.app.data.sample_data import save_sample_data_to_files
save_sample_data_to_files()
"
echo "✅ Sample data generated"

# Start Celery worker in background
echo "⚙️  Starting Celery worker..."
celery -A backend.app.core.celery_app:app worker --loglevel=info --detach
echo "✅ Celery worker started"

# Start Celery beat scheduler
echo "⏰ Starting Celery beat scheduler..."
celery -A backend.app.core.celery_app:app beat --loglevel=info --detach
echo "✅ Celery beat scheduler started"

# Wait a moment for services to start
sleep 2

# Start FastAPI development server
echo "🚀 Starting HPCL FastAPI server..."
echo "📝 API Documentation: http://localhost:8000/docs"
echo "💊 Health Check: http://localhost:8000/health"
echo "🔧 Admin Panel: http://localhost:8000/admin"
echo ""
echo "Press Ctrl+C to stop all services"
echo "================================================"

# Start the FastAPI app
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# Cleanup on exit
echo ""
echo "🛑 Stopping services..."
pkill -f "celery worker"
pkill -f "celery beat"
echo "✅ Services stopped"
