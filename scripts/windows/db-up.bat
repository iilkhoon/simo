@echo off
rem PostgreSQL-i işə salır: Docker varsa docker compose, yoxdursa lokal PostgreSQL-in işlədiyini yoxlayır.
cd /d "%~dp0..\.."
where docker >nul 2>nul
if errorlevel 1 goto nodocker
docker info >nul 2>nul
if errorlevel 1 (
  echo [XETA] Docker Desktop quraşdırılıb, amma işləmir. Docker Desktop-u açın, 1 dəqiqə gözləyin və yenidən cəhd edin.
  exit /b 1
)
echo PostgreSQL (Docker^) işə salınır...
docker compose up -d db
if errorlevel 1 ( echo [XETA] docker compose alınmadı & exit /b 1 )
set /a tries=0
:wait
docker compose exec -T db pg_isready -U simo -d simo >nul 2>nul
if not errorlevel 1 ( echo PostgreSQL hazırdır. & exit /b 0 )
set /a tries+=1
if %tries% GEQ 30 ( echo [XETA] PostgreSQL 60 saniyədə açılmadı & exit /b 1 )
timeout /t 2 /nobreak >nul
goto wait

:nodocker
echo Docker tapılmadı - lokal PostgreSQL istifadə olunur (localhost:5432).
echo Lazımdır: istifadəçi "simo", parol "simo", baza "simo".
echo Yoxdursa pgAdmin / psql ilə yaradın:
echo    CREATE USER simo WITH PASSWORD 'simo' CREATEDB;
echo    CREATE DATABASE simo OWNER simo;
echo Ya da sadəcə Docker Desktop quraşdırın: https://www.docker.com/products/docker-desktop
powershell -NoProfile -Command "if ((Test-NetConnection localhost -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 0 } else { exit 1 }"
if errorlevel 1 ( echo [XETA] localhost:5432-də PostgreSQL cavab vermir. & exit /b 1 )
exit /b 0
