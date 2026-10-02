@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%新版界面\ui_pages_618336854786"

echo ====================================
echo 启动后端服务（端口3000）...
echo ====================================
if not exist "%BACKEND_DIR%" (
    echo 错误: 找不到后端目录: %BACKEND_DIR%
    pause
    exit /b 1
)
start "后端服务" cmd /k "set PORT=3000 && set NODE_ENV=development && cd /d ""%BACKEND_DIR%"" && npm run dev"

timeout /t 2 /nobreak >nul

echo ====================================
echo 启动前端服务（端口8080）...
echo ====================================
if not exist "%FRONTEND_DIR%" (
    echo 错误: 找不到前端目录: %FRONTEND_DIR%
    pause
    exit /b 1
)
start "前端服务" cmd /k "cd /d ""%FRONTEND_DIR%"" && npx http-server -p 8080 --silent"

echo.
echo ====================================
echo 等待服务启动...
echo ====================================
timeout /t 5 /nobreak >nul

echo.
echo ====================================
echo 两个服务已启动！
echo ====================================
echo 后端服务: http://localhost:3000
echo 前端服务: http://localhost:8080
echo.
echo 正在打开浏览器...
echo ====================================

REM 打开浏览器访问登录页
start http://localhost:8080/P-LOGIN.html

echo.
echo 浏览器已打开！
echo 如果页面无法访问，请等待几秒钟后刷新页面
echo ====================================
pause

