@echo off
title Cloudflare Tunnel - Smart Museum MVP
echo =========================================================================
echo [*] Khoi dong Cloudflare Tunnel cho ban MVP
echo [*] Local Target : http://localhost:5173 (Vite Frontend + FastAPI Proxy)
echo =========================================================================
echo.
cd /d "%~dp0"
if not exist "cloudflared.exe" (
    echo [ERROR] Khong tim thay cloudflared.exe trong thu muc nay!
    pause
    exit /b 1
)

echo [*] Dang tao duong ham Public HTTPS tu Cloudflare...
echo [*] Tim dong link: https://xxxx.trycloudflare.com de truy cap tren dien thoai.
echo =========================================================================
echo.
cloudflared.exe tunnel --url http://localhost:5173
pause

