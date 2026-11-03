@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Simo - serverə quraşdırma
rem Kodu VPS-ə göndərir və orada hər şeyi qurur (PostgreSQL, backend, sayt, admin, ehtiyat nüsxə).
rem Təkrar işlətmək olar: kodu yeniləyir, baza və parollar saxlanılır.

set "IP="
if exist ".server" set /p IP=<.server
if defined IP (
  set /p NEWIP=Server IP [%IP%] - Enter basın və ya yenisini yazın: 
) else (
  set /p NEWIP=Server IP ünvanı: 
)
if defined NEWIP set "IP=%NEWIP%"
if not defined IP ( echo IP yazılmadı. & pause & exit /b 1 )
> ".server" echo %IP%
set "DOMAIN="
set /p DOMAIN=Domen (yoxdursa sadəcə Enter): 

where ssh >nul 2>nul || ( echo [XETA] Windows-da OpenSSH yoxdur: Parametrlər - Proqramlar - Əlavə komponentlər - "OpenSSH Client" & pause & exit /b 1 )

echo.
echo [1/3] Kod arxivlənir...
set "ARC=%TEMP%\simo-deploy.tgz"
if exist "%ARC%" del "%ARC%"
tar -czf "%ARC%" --exclude=node_modules --exclude=".localdb*" --exclude=.env --exclude=xeta.log --exclude=uploads --exclude=generated --exclude=dist backend web deploy
if errorlevel 1 ( echo [XETA] Arxiv yaradılmadı & pause & exit /b 1 )

echo.
echo [2/3] Serverə göndərilir - root parolunu yazın (yazarkən görünmür, bu normaldır)
scp -o StrictHostKeyChecking=accept-new "%ARC%" root@%IP%:/root/simo.tgz
if errorlevel 1 ( echo [XETA] Göndərilmədi. IP və parolu yoxlayın. & pause & exit /b 1 )

echo.
echo [3/3] Serverdə quraşdırılır (ilk dəfə 5-10 dəqiqə) - parolu bir daha yazın
ssh -t -o StrictHostKeyChecking=accept-new root@%IP% "rm -rf /root/simo-src && mkdir -p /root/simo-src && tar -xzf /root/simo.tgz -C /root/simo-src deploy/setup.sh && sed -i 's/\r$//' /root/simo-src/deploy/setup.sh && bash /root/simo-src/deploy/setup.sh /root/simo.tgz %DOMAIN%"
if errorlevel 1 ( echo. & echo [XETA] Quraşdırma tamamlanmadı - yuxarıdakı mətni göndərin. & pause & exit /b 1 )

rem Telefondakı tətbiq bu serverə qoşulsun
if defined DOMAIN (
  > "mobile\.env" echo EXPO_PUBLIC_API_URL=https://api.%DOMAIN%
) else (
  > "mobile\.env" echo EXPO_PUBLIC_API_URL=http://%IP%
)
echo.
echo ==============================================
echo   Server hazırdır. İndi BASLAT.bat - tətbiq serverə qoşulacaq.
echo   (Kompüterdəki lokal backend artıq lazım deyil)
echo ==============================================
pause
