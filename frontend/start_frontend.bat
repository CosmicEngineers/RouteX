@echo off
echo ========================================
echo  HPCL RouteX Frontend Startup
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    echo This may take a few minutes on first run...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies!
        echo Please check your Node.js installation and internet connection.
        pause
        exit /b 1
    )
    echo.
    echo ✓ Dependencies installed successfully!
    echo.
) else (
    echo ✓ Dependencies already installed
    echo.
)

echo [2/2] Starting Next.js development server...
echo.
echo Frontend will be available at:
echo   ➜ Local:   http://localhost:3000
echo   ➜ Network: http://your-ip:3000
echo.
echo Make sure the backend is running at http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

npm run dev
