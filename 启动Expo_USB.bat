@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%download-APP_GENERATION\app_618336854786"
set "ADB_DIR=C:\Users\super\Downloads\platform-tools-latest-windows\platform-tools"

if not exist "%APP_DIR%" (
    echo 找不到前端目录: %APP_DIR%
    pause
    exit /b 1
)

if exist "%ADB_DIR%\adb.exe" (
    "%ADB_DIR%\adb.exe" devices
    "%ADB_DIR%\adb.exe" reverse tcp:8081 tcp:8081
    "%ADB_DIR%\adb.exe" reverse tcp:8082 tcp:8082
    "%ADB_DIR%\adb.exe" reverse tcp:8083 tcp:8083
    "%ADB_DIR%\adb.exe" reverse tcp:19000 tcp:19000
    "%ADB_DIR%\adb.exe" reverse tcp:19001 tcp:19001
    "%ADB_DIR%\adb.exe" reverse tcp:3000 tcp:3000
) else (
    echo 未找到 adb.exe: %ADB_DIR%\adb.exe
)

set EXPO_PUBLIC_API_HOST=127.0.0.1:3000
set RCT_METRO_PORT=8083
start "Expo DevServer" cmd /k "cd /d "%APP_DIR%" && npx expo start --localhost"
timeout /t 5 /nobreak >nul
start http://localhost:19002

