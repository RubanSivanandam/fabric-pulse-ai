@echo off
echo =====================================
echo Fabric Pulse AI - Windows Service Setup
echo =====================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - Good!
) else (
    echo ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo.
echo Step 1: Installing Python Dependencies...
pip install -r requirements.txt

if %errorLevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Installing pywin32 post-install scripts...
python -c "import sys; import os; os.system(sys.executable + ' Scripts/pywin32_postinstall.py -install')"

echo.
echo Step 3: Installing Fabric Pulse AI Backend Service...
python windows_service_fabric_pulse.py install

if %errorLevel% neq 0 (
    echo ERROR: Failed to install backend service
    pause
    exit /b 1
)

echo.
echo Step 4: Starting Fabric Pulse AI Backend Service...
python windows_service_fabric_pulse.py start

if %errorLevel% neq 0 (
    echo ERROR: Failed to start backend service
    pause
    exit /b 1
)

echo.
echo =====================================
echo Setup Complete!
echo =====================================
echo.
echo Backend Service: RUNNING on http://localhost:8000
echo.
echo Service Management Commands:
echo - Start:   python windows_service_fabric_pulse.py start
echo - Stop:    python windows_service_fabric_pulse.py stop
echo - Restart: python windows_service_fabric_pulse.py restart
echo - Status:  python windows_service_fabric_pulse.py status
echo.
echo Frontend Setup:
echo 1. Open new terminal in project root
echo 2. Run: npm run dev
echo 3. Open: http://localhost:5173
echo.
echo Check service status in Windows Services (services.msc)
echo Service Name: "Fabric Pulse AI - RTMS Service"
echo.
pause