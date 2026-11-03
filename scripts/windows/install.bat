@echo off
rem Paketlər yoxdursa (ilk dəfə) quraşdırır. Hamısı layihə qovluğunun içinə düşür.
cd /d "%~dp0..\.."
if not exist "backend\node_modules\embedded-postgres" (
  echo.
  echo [1/2] Backend paketləri yüklənir (ilk dəfə, bir neçə dəqiqə^)...
  pushd backend
  call npm install --no-fund --no-audit
  if errorlevel 1 ( popd & echo [XETA] backend paketləri yüklənmədi & exit /b 1 )
  popd
)
if not exist "mobile\node_modules\expo" (
  echo.
  echo [2/2] Mobil tətbiq paketləri yüklənir (ilk dəfə, 3-5 dəqiqə^)...
  pushd mobile
  call npm install --no-fund --no-audit
  if errorlevel 1 ( popd & echo [XETA] mobile paketləri yüklənmədi & exit /b 1 )
  popd
)
exit /b 0
