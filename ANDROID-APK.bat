@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Simo - Android APK (zəng, canlı yayın üçün)
rem Expo serverlərində Android APK yığır (pulsuz, ~15 dəqiqə). Hazır olanda link/QR verir - telefona yükləyib quraşdırın.
call "%~dp0scripts\windows\node.bat" || ( pause & exit /b 1 )
call "%~dp0scripts\windows\install.bat" || ( pause & exit /b 1 )
cd mobile
echo [1/3] Expo hesabına giriş (expo.dev istifadəçi adı və parolu)
call npx -y eas-cli@latest whoami >nul 2>nul || call npx -y eas-cli@latest login
if errorlevel 1 ( echo [XETA] Giriş alınmadı & pause & exit /b 1 )
echo.
echo [2/3] Layihə Expo hesabına bağlanır (ilk dəfə "Y" deyin)
call npx -y eas-cli@latest init
echo.
echo [3/3] APK yığılır - server: https://api.13-140-206-78.sslip.io
echo     Suallara: Android keystore yaradılsın? - "Y" (Enter^)
call npx -y eas-cli@latest build -p android --profile preview
echo.
echo Hazır olanda yuxarıdakı linki telefonda açın, APK-nı yükləyib quraşdırın
echo ("naməlum mənbələrdən quraşdırma"ya icazə verin^).
pause
