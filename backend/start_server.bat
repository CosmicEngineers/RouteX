@echo off
echo Starting HPCL Coastal Tanker Optimization Backend...
echo.
echo MongoDB Status: Will use in-memory storage if MongoDB is not available
echo Server will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
