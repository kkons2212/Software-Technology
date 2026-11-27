@echo off
setlocal enabledelayedexpansion
title Smart Museum MVP - Local Runner
cd /d "%~dp0"

echo =========================================================================
echo [*] SMART MUSEUM - KHOI DONG HE THONG CHAY CUC BO (LOCAL)
echo =========================================================================
echo.

:: Cau hinh Database Docker Image tu GitHub Container Registry (GHCR)
set "DB_CONTAINER=smart-museum-db"
set "DB_IMAGE=ghcr.io/kkons2212/software-technology-db:latest"

:: 1. Kiem tra va khoi dong MySQL Database (Docker)
echo [1/3] Kiem tra Database Docker (%DB_CONTAINER%)...
docker ps --format "{{.Names}}" 2>nul | findstr /i "smart-museum-db smart_museum_db" >nul
if !ERRORLEVEL! equ 0 (
    echo       [OK] Database dang hoat dong.
) else (
    docker ps -a --format "{{.Names}}" 2>nul | findstr /i "smart-museum-db" >nul
    if !ERRORLEVEL! equ 0 (
        echo       [*] Dang khoi dong container 'smart-museum-db'...
        docker start smart-museum-db >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            echo       [OK] Da khoi dong database thanh cong.
        ) else (
            echo       [ERROR] Khong the khoi dong container 'smart-museum-db'.
        )
    ) else (
        docker ps -a --format "{{.Names}}" 2>nul | findstr /i "smart_museum_db" >nul
        if !ERRORLEVEL! equ 0 (
            echo       [*] Dang khoi dong container 'smart_museum_db'...
            docker start smart_museum_db >nul 2>&1
            if !ERRORLEVEL! equ 0 (
                echo       [OK] Da khoi dong database thanh cong.
            ) else (
                echo       [ERROR] Khong the khoi dong container 'smart_museum_db'.
            )
        ) else (
            echo       [*] Container chua ton tai. Dang khoi tao tu GitHub Image:
            echo           %DB_IMAGE%
            if exist "%~dp0docker-compose.yml" (
                docker compose -f "%~dp0docker-compose.yml" up -d db >nul 2>&1
            ) else (
                docker run -d --name %DB_CONTAINER% -p 3306:3306 -e MYSQL_DATABASE=smart_museum -e MYSQL_USER=museum_app_user -e MYSQL_PASSWORD=app_password_456 -e MYSQL_ROOT_PASSWORD=root_secure_pass_123 -v museum_mysql_data:/var/lib/mysql --restart always %DB_IMAGE% --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci >nul 2>&1
            )
            if !ERRORLEVEL! equ 0 (
                echo       [OK] Da tao va khoi dong database thanh cong tu GitHub image.
            ) else (
                echo       [CANH BAO] Khong the tao container database tu Docker.
                echo       Vui long dam bao Docker Desktop dang chay hoac MySQL mo tai localhost:3306.
            )
        )
    )
)
echo.

:: 2. Khoi dong Backend (FastAPI on Port 8000)
echo [2/3] Khoi dong Backend (FastAPI - Port 8000)...
set "BACKEND_PYTHON=python"
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "BACKEND_PYTHON=%~dp0backend\.venv\Scripts\python.exe"
) else if exist "%~dp0..\.venv\Scripts\python.exe" (
    set "BACKEND_PYTHON=%~dp0..\.venv\Scripts\python.exe"
)
start "Smart Museum - Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && "%BACKEND_PYTHON%" -m uvicorn app.main:app --reload --port 8000"
echo       [OK] Backend dang khoi dong trong cua so rieng.
echo.

:: 3. Khoi dong Frontend (Vite on Port 5173)
echo [3/3] Khoi dong Frontend (Vite - Port 5173)...
start "Smart Museum - Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"
echo       [OK] Frontend dang khoi dong trong cua so rieng.
echo.

echo =========================================================================
echo [*] HE THONG DA DUOC KHOI DONG THANH CONG!
echo.
echo     - Trang chu / Du khach (Visitor):  http://localhost:5173/visitor
echo     - Quan tri vien (Admin Portal):   http://localhost:5173/admin
echo     - Kiem duyet dich (Audit View):   http://localhost:5173/admin/translations
echo     - Tai lieu API (Swagger Docs):     http://localhost:8000/docs
echo.
echo [*] Nhan bat ky phim nao de mo ung dung tren trinh duyet...
echo =========================================================================
pause >nul
start http://localhost:5173/admin/translations
