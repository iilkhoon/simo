@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Simo - Expo Go
if not exist "mobile\node_modules" ( echo Əvvəlcə 1-QURASDIR.bat işlədin. & pause & exit /b 1 )

for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\lan-ip.ps1"`) do set LANIP=%%i
rem Expo eyni IP-ni versin (Docker/WSL virtual adapterini yox) - tətbiq backend-i də bu IP-dən tapır (:4000)
set REACT_NATIVE_PACKAGER_HOSTNAME=%LANIP%

echo ============================================
echo   1. Telefon və kompüter EYNİ Wi-Fi-da olmalıdır
echo   2. Telefonda "Expo Go" tətbiqini açın
echo      Android: QR kodu Expo Go ilə skan edin
echo      iPhone:  QR kodu adi Kamera ilə skan edin
echo   Backend: http://%LANIP%:4000 (2-BACKEND.bat açıq olmalıdır)
echo   Yenidən yükləmək: bu pəncərədə "r", menyu: "m"
echo ============================================
echo.
pushd mobile
call npx expo start --lan %*
popd
pause
