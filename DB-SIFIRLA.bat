@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Simo - bazanı sıfırla
echo DIQQET: verilənlər bazasındakı BÜTÜN məlumatlar silinəcək (hesablar, mesajlar, balanslar)
echo və demo profillər yenidən yaradılacaq.
set /p ok=Davam? (h/y): 
if /i not "%ok%"=="h" exit /b 0
call "%~dp0scripts\windows\db-up.bat"
if errorlevel 1 ( pause & exit /b 1 )
pushd backend
call npx prisma migrate reset --force
set SEED_DEMO=true
call npm run db:seed
popd
echo Hazırdır.
pause
