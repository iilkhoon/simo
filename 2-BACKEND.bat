@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Simo - Backend API
if not exist "backend\node_modules" ( echo Əvvəlcə 1-QURASDIR.bat işlədin. & pause & exit /b 1 )

call "%~dp0scripts\windows\db-up.bat"
if errorlevel 1 ( pause & exit /b 1 )

for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\lan-ip.ps1"`) do set LANIP=%%i
rem Yüklənən şəkil/video linkləri telefonun aça biləcəyi ünvanla yazılsın (.env-dəki localhost-un yerinə)
set PUBLIC_URL=http://%LANIP%:4000

pushd backend
echo Yeni miqrasiyalar varsa tətbiq olunur...
call npx prisma migrate deploy >nul
echo.
echo ============================================
echo   Backend: http://%LANIP%:4000
echo   Telefonda yoxlamaq: brauzerdə http://%LANIP%:4000/health
echo   OTP kodu (DEV_MODE=true^) tətbiqdə və bu pəncərədə görünür
echo   Dayandırmaq: Ctrl+C
echo ============================================
echo.
call npm run dev
popd
pause
