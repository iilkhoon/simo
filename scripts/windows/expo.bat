@echo off
chcp 65001 >nul
title Simo - Expo Go (bu pəncərəni bağlamayın)
call "%~dp0node.bat" || ( pause & exit /b 1 )
cd /d "%~dp0..\.."
for /f "delims=" %%i in ('node scripts\lan-ip.mjs') do set LANIP=%%i
rem Expo telefona bu IP-ni versin; tətbiq backend-i də həmin IP-də tapır (:4000)
set REACT_NATIVE_PACKAGER_HOSTNAME=%LANIP%
set EXPO_NO_TELEMETRY=1
echo ===================================================
echo   Telefon və kompüter EYNİ Wi-Fi-da olmalıdır.
echo   Telefonda Expo Go-nu açın və aşağıdakı QR kodu skan edin:
echo     Android - Expo Go içindən "Scan QR code"
echo     iPhone  - adi Kamera ilə
echo   Yenidən yükləmək: "r"   Bağlamaq: Ctrl+C
echo ===================================================
cd mobile
call npx expo start --lan
pause
