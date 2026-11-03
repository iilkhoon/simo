@echo off
rem Node.js varsa onu işlədir, yoxdursa portativ versiyanı layihə qovluğuna (.tools\node) yükləyir.
rem Kompüterə heç nə quraşdırılmır.
set "SIMO_ROOT=%~dp0..\..\"
if exist "%SIMO_ROOT%.tools\node\node.exe" (
  set "PATH=%SIMO_ROOT%.tools\node;%PATH%"
  exit /b 0
)
where node >nul 2>nul
if not errorlevel 1 exit /b 0

set NODE_VER=v22.23.4
echo Node.js tapılmadı - portativ versiya yüklənir (~30 MB, bir dəfə^)...
if not exist "%SIMO_ROOT%.tools" mkdir "%SIMO_ROOT%.tools"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue';" ^
  "$zip = Join-Path '%SIMO_ROOT%.tools' 'node.zip';" ^
  "Invoke-WebRequest -Uri 'https://nodejs.org/dist/%NODE_VER%/node-%NODE_VER%-win-x64.zip' -OutFile $zip;" ^
  "Expand-Archive -Path $zip -DestinationPath '%SIMO_ROOT%.tools' -Force;" ^
  "Rename-Item -Path (Join-Path '%SIMO_ROOT%.tools' 'node-%NODE_VER%-win-x64') -NewName 'node';" ^
  "Remove-Item $zip"
if not exist "%SIMO_ROOT%.tools\node\node.exe" (
  echo [XETA] Node.js yüklənmədi. İnternet bağlantısını yoxlayın.
  exit /b 1
)
set "PATH=%SIMO_ROOT%.tools\node;%PATH%"
echo Node.js hazırdır.
exit /b 0
