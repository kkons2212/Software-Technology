@echo off
title Smart Museum MVP - Local Runner
cd /d "%~dp0"

echo =========================================================================
echo [*] SMART MUSEUM - KHOI DONG HE THONG CHAY CUC BO (LOCAL)
echo =========================================================================
echo.

:: 1. Kiem tra va khoi dong MySQL Database (Docker)
echo [1/3] Kiem tra Database Docker (smart_museum_db)...
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

:: 2. Khoi dong Backend (FastAPI on Port 8000)
echo [2/3] Khoi dong Backend (FastAPI - Port 8000)...
start "Smart Museum - Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
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
