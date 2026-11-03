@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Simo - ilk quraşdırma
echo ============================================
echo   Simo - ilk quraşdırma (bir dəfə işlədin)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [XETA] Node.js tapılmadı. https://nodejs.org saytından LTS versiyanı (20+^) quraşdırın.
  pause & exit /b 1
)
for /f %%v in ('node -v') do echo Node.js: %%v

if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  echo backend\.env yaradıldı (backend\.env.example-dən^).
) else (
  echo backend\.env artıq var - toxunulmadı.
)

call "%~dp0scripts\windows\db-up.bat"
if errorlevel 1 ( pause & exit /b 1 )

echo.
echo [1/4] Backend paketləri quraşdırılır...
pushd backend
call npm install
if errorlevel 1 ( echo [XETA] backend npm install alınmadı & popd & pause & exit /b 1 )
call npx prisma generate
echo.
echo [2/4] Verilənlər bazası cədvəlləri yaradılır...
call npx prisma migrate deploy
if errorlevel 1 ( echo [XETA] Miqrasiya alınmadı. PostgreSQL işləyirmi? & popd & pause & exit /b 1 )
echo.
echo [3/4] Hədiyyələr, paketlər və demo profillər yazılır...
set SEED_DEMO=true
call npm run db:seed
set SEED_DEMO=
popd

echo.
echo [4/4] Mobil tətbiq paketləri quraşdırılır (bir neçə dəqiqə çəkə bilər)...
pushd mobile
call npm install
if errorlevel 1 ( echo [XETA] mobile npm install alınmadı & popd & pause & exit /b 1 )
popd

echo.
echo ============================================
echo   Hazırdır!
echo   Sonra: BASLAT.bat (backend + Expo Go birlikdə)
echo   Telefon tapmırsa: FIREWALL-AC.bat (administrator kimi)
echo ============================================
pause
