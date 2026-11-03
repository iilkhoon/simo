@echo off
chcp 65001 >nul
rem Telefonun kompüterə qoşulması üçün Windows Firewall-da 4000 (API) və 8081 (Expo) portlarını açır.
net session >nul 2>nul
if errorlevel 1 (
  echo Administrator icazəsi lazımdır - pəncərə yenidən açılır...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="Simo API 4000" >nul 2>nul
netsh advfirewall firewall delete rule name="Simo Expo 8081" >nul 2>nul
netsh advfirewall firewall add rule name="Simo API 4000" dir=in action=allow protocol=TCP localport=4000 profile=private,domain
netsh advfirewall firewall add rule name="Simo Expo 8081" dir=in action=allow protocol=TCP localport=8081 profile=private,domain
echo.
echo Portlar açıldı. Wi-Fi şəbəkəniz Windows-da "Private" (Şəxsi) olmalıdır:
echo Parametrlər - Şəbəkə və İnternet - Wi-Fi - şəbəkənin adı - "Private network".
pause
