@echo off
setlocal
title Xinlai Project Launcher

echo ==========================================
echo      Xinlai Project Launcher
echo ==========================================
echo.

:: Get project root and backend dir
set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend"

echo [1/3] Checking environment...
if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found at:
    echo         "%BACKEND_DIR%"
    pause
    exit /b
)

:: Check node_modules
if not exist "%BACKEND_DIR%\node_modules" (
    echo [INFO] Dependencies not found. Installing...
    cd /d "%BACKEND_DIR%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b
    )
    cd /d "%PROJECT_ROOT%"
)

echo [2/3] Checking port 3030...
netstat -ano | findstr ":3030" >nul
if not errorlevel 1 (
    echo [WARNING] Port 3030 seems to be in use.
) else (
    echo [OK] Port 3030 is free.
)

echo [3/3] Starting backend service...
echo.
echo ------------------------------------------
echo Backend is starting in a new window...
echo ------------------------------------------

:: Start backend using /D for directory switch to handle paths better
:: Adding "|| pause" to keep window open if npm fails
start "Xinlai Backend Service" /D "%BACKEND_DIR%" cmd /k "npm run dev || pause"

echo.
echo ==========================================
echo [Frontend Guide]
echo 1. Open HBuilderX
echo 2. Import project: "%PROJECT_ROOT%renqinglai"
echo 3. Run -> Run to Phone or Emulator
echo.
echo [Service Info]
echo Local URL:   http://localhost:3030/api/health
echo Android URL: http://10.0.2.2:3030/api/health
echo ==========================================
echo.
echo Press any key to close this launcher...
pause >nul
endlocal
