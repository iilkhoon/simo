@echo off
chcp 65001 >nul
rem ==== Simo: test üçün hər şeyi başladır. Sadəcə iki dəfə klikləyin. ====
rem Lazım olan hər şey (Node.js, verilənlər bazası, paketlər) layihə qovluğunun içinə yüklənir.
cd /d "%~dp0"
title Simo - başladılır
call "%~dp0scripts\windows\node.bat" || ( pause & exit /b 1 )
call "%~dp0scripts\windows\install.bat" || ( pause & exit /b 1 )
start "Simo Backend" cmd /k ""%~dp0scripts\windows\backend.bat""
echo Backend açılır...
timeout /t 10 /nobreak >nul
start "Simo Expo" cmd /k ""%~dp0scripts\windows\expo.bat""
echo.
echo İki pəncərə açıldı: "Backend" və "Expo". QR kod Expo pəncərəsindədir.
echo Telefon qoşulmursa: FIREWALL-AC.bat
timeout /t 8 >nul
