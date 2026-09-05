@echo off
cd /d "%~dp0"
echo.
echo ePDF Studio — network demo mode
echo ================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  set "IP=%%a"
  goto :found
)
:found
set IP=%IP: =%
echo.
echo Your laptop IP:  %IP%
echo.
echo Share this URL with anyone on the SAME Wi-Fi / office network:
echo.
echo    http://%IP%:8000
echo.
echo Keep this window open while they use the app.
echo Press Ctrl+C to stop the server.
echo.
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
pause
