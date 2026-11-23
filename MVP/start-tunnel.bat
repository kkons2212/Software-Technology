@echo off
title Smart Museum MVP - Cloudflare Tunnel Runner
cd /d "%~dp0"

echo =========================================================================
echo [*] SMART MUSEUM - KHOI DONG HE THONG KEM CLOUDFLARE TUNNEL (HTTPS)
echo =========================================================================
echo.

:: 1. Tim kiem cloudflared.exe (uu tien: thu muc hien tai -> thu muc POC -> PATH)
set "CLOUDFLARED_BIN="
if exist "%~dp0cloudflared.exe" (
    set "CLOUDFLARED_BIN=%~dp0cloudflared.exe"
) else if exist "%~dp0..\POC\cloudflared.exe" (
    set "CLOUDFLARED_BIN=%~dp0..\POC\cloudflared.exe"
) else (
    where cloudflared >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "CLOUDFLARED_BIN=cloudflared"
    )
)

if "%CLOUDFLARED_BIN%"=="" (
    echo [ERROR] Khong tim thay cloudflared.exe!
    echo Vui long dat file cloudflared.exe vao thu muc nay hoac thu muc POC.
    echo.
    pause
    exit /b 1
)

:: 2. Kiem tra va khoi dong MySQL Database (Docker)
echo [1/4] Kiem tra Database Docker (smart_museum_db)...
docker ps --format "{{.Names}}" 2>nul | findstr /i "smart_museum_db" >nul
if %ERRORLEVEL% equ 0 (
    echo       [OK] Database 'smart_museum_db' dang hoat dong.
) else (
    docker ps -a --format "{{.Names}}" 2>nul | findstr /i "smart_museum_db" >nul
    if %ERRORLEVEL% equ 0 (
        echo       [*] Dang khoi dong container 'smart_museum_db'...
        docker start smart_museum_db >nul 2>&1
        echo       [OK] Da khoi dong database thanh cong.
    ) else (
        echo       [CANH BAO] Khong tim thay container 'smart_museum_db'.
        echo       Vui long dam bao MySQL dang chay tai localhost:3306.
    )
)
echo.

:: 3. Khoi dong Backend (FastAPI on Port 8000)
echo [2/4] Khoi dong Backend (FastAPI - Port 8000)...
start "Smart Museum - Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
echo       [OK] Backend dang khoi dong trong cua so rieng.
echo.

:: 4. Khoi dong Frontend (Vite on Port 5173)
echo [3/4] Khoi dong Frontend (Vite - Port 5173)...
start "Smart Museum - Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"
echo       [OK] Frontend dang khoi dong trong cua so rieng.
echo.

:: 5. Cho 3 giay de Vite san sang truoc khi bat Tunnel
echo [4/4] Dang ket noi Cloudflare Tunnel...
timeout /t 3 /nobreak >nul

echo =========================================================================
echo [*] Dang tao duong ham Public HTTPS tu Cloudflare...
echo [*] Local Target : http://localhost:5173 (Vite + FastAPI Proxy)
echo [*] Chu y tim dong URL: https://xxxx.trycloudflare.com de mo tren dien thoai.
echo =========================================================================
echo.

"%CLOUDFLARED_BIN%" tunnel --url http://localhost:5173
pause
