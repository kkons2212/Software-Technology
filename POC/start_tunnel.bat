@echo off
title Cloudflare Tunnel - Smart Museum POC
echo ===============================================================
echo     KHOI DONG CLOUDFLARE TUNNEL - SMART MUSEUM POC
echo ===============================================================
echo.
echo [Luu y] Hay chac chan rang Frontend (npm run dev) dang chay o cong 5173
echo.

if exist "%~dp0cloudflared.exe" (
    echo [OK] Tim thay cloudflared.exe trong thu muc POC!
    echo Dang khoi tao tunnel...
    "%~dp0cloudflared.exe" tunnel --url http://localhost:5173
) else (
    echo Dang kiem tra cloudflared tu he thong...
    cloudflared tunnel --url http://localhost:5173
)

pause
