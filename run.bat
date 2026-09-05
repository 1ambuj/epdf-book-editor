@echo off
cd /d "%~dp0"
echo Installing Python packages...
python -m pip install -r requirements.txt
echo.
echo Starting ePDF editor at http://127.0.0.1:8000
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
pause
