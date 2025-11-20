@echo off
REM HPCL Coastal Tanker Optimizer - Windows Development Startup Script
REM Starts all required services for local development on Windows

echo.
echo 🚢 Starting HPCL Coastal Tanker Fleet Optimizer...
echo ================================================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 3.11+ is required
    pause
    exit /b 1
)

echo ✅ Python detected

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo 🔧 Activating virtual environment...
    call venv\Scripts\activate.bat
    echo ✅ Virtual environment activated
)

REM Install dependencies
echo 📦 Installing dependencies...
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

REM Check if Redis is available
echo 🔄 Checking Redis...
redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Redis not detected. Install Redis or use Docker:
    echo    docker run -d -p 6379:6379 redis:alpine
    echo.
    echo Starting without Redis (background tasks disabled)
) else (
    echo ✅ Redis is available
)

REM Check if MongoDB is available  
echo 🔄 Checking MongoDB...
mongo --eval "db.runCommand('ping')" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  MongoDB not detected. Install MongoDB or use Docker:
    echo    docker run -d -p 27017:27017 mongo:latest
    echo.
    echo Starting without MongoDB (data persistence disabled)
) else (
    echo ✅ MongoDB is available
)

REM Generate sample data
echo 📊 Generating HPCL sample data...
python -c "import sys; sys.path.append('.'); from backend.app.data.sample_data import save_sample_data_to_files; save_sample_data_to_files()"
if errorlevel 1 (
    echo ⚠️  Could not generate sample data
) else (
    echo ✅ Sample data generated
)

REM Start Celery worker in background (if Redis available)
redis-cli ping >nul 2>&1
if not errorlevel 1 (
    echo ⚙️  Starting Celery worker...
    start /B celery -A backend.app.core.celery_app:app worker --loglevel=info
    echo ✅ Celery worker started
    
    echo ⏰ Starting Celery beat scheduler...
    start /B celery -A backend.app.core.celery_app:app beat --loglevel=info  
    echo ✅ Celery beat scheduler started
)

REM Wait for services to start
timeout /t 3 /nobreak >nul

echo.
echo 🚀 Starting HPCL FastAPI server...
echo 📝 API Documentation: http://localhost:8000/docs
echo 💊 Health Check: http://localhost:8000/health
echo 🔧 System Status: http://localhost:8000/api/v1/status
echo.
echo Press Ctrl+C to stop the server
echo ================================================

REM Start the FastAPI app
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo 🛑 Server stopped
pause
