#!/bin/bash

echo "========================================"
echo " HPCL RouteX Frontend Startup"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[1/2] Installing dependencies..."
    echo "This may take a few minutes on first run..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to install dependencies!"
        echo "Please check your Node.js installation and internet connection."
        exit 1
    fi
    echo ""
    echo "✓ Dependencies installed successfully!"
    echo ""
else
    echo "✓ Dependencies already installed"
    echo ""
fi

echo "[2/2] Starting Next.js development server..."
echo ""
echo "Frontend will be available at:"
echo "  ➜ Local:   http://localhost:3000"
echo "  ➜ Network: http://your-ip:3000"
echo ""
echo "Make sure the backend is running at http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
