@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Simo - Apple açarlarını serverə yaz
echo ======================================================
echo   Apple açarları serverə yazılır.
echo   .p8 faylını bu pəncərəyə SÜRÜŞDÜRÜN və Enter basın.
echo   Hansısa açar hələ yoxdursa, boş buraxıb Enter basın.
echo ======================================================
echo.
set "IP="
if exist ".server" set /p IP=<.server
if not defined IP set /p IP=Server IP: 
set "TEAM=36W77TT9ZQ"

set "APNS="
set /p APNS=1) APNs açarı (AuthKey_XXXX.p8): 
set "APNS=!APNS:"=!"
set "APNS_ID="
if defined APNS (
  for %%f in ("!APNS!") do set "N=%%~nf"
  set "APNS_ID=!N:AuthKey_=!"
  set /p APNS_ID=   APNS Key ID [!APNS_ID!]: 
  set /p TEAM=   Team ID [!TEAM!]: 
)

echo.
set "IAP="
set /p IAP=2) In-App Purchase açarı (SubscriptionKey_XXXX.p8 və ya AuthKey_XXXX.p8): 
set "IAP=!IAP:"=!"
set "IAP_ID="
set "ISSUER="
if defined IAP (
  for %%f in ("!IAP!") do set "N=%%~nf"
  set "IAP_ID=!N:SubscriptionKey_=!"
  set "IAP_ID=!IAP_ID:AuthKey_=!"
  set /p IAP_ID=   IAP Key ID [!IAP_ID!]: 
  set /p ISSUER=   Issuer ID (Integrations səhifəsinin yuxarısında, uzun kod^): 
)

if not defined APNS if not defined IAP ( echo Heç bir fayl seçilmədi. & pause & exit /b 0 )

set "FILES=deploy\apple-keys.sh"
if defined APNS set FILES=!FILES! "!APNS!"
if defined IAP set FILES=!FILES! "!IAP!"
echo.
echo Serverə göndərilir - root parolunu yazın...
if defined APNS ( scp -o StrictHostKeyChecking=accept-new "!APNS!" root@%IP%:/root/apns.p8 || goto err )
if defined IAP ( scp -o StrictHostKeyChecking=accept-new "!IAP!" root@%IP%:/root/iap.p8 || goto err )
scp -o StrictHostKeyChecking=accept-new deploy\apple-keys.sh root@%IP%:/root/apple-keys.sh || goto err
set "A=-" & if defined APNS set "A=/root/apns.p8"
set "B=-" & if defined IAP set "B=/root/iap.p8"
echo Serverdə yazılır - parolu bir daha yazın...
ssh -o StrictHostKeyChecking=accept-new root@%IP% "sed -i 's/\r$//' /root/apple-keys.sh && bash /root/apple-keys.sh !A! '!APNS_ID!' '!TEAM!' !B! '!IAP_ID!' '!ISSUER!' && rm -f /root/apple-keys.sh" || goto err
echo.
echo ✓ Hazırdır. .p8 fayllarını kompüterdə təhlükəsiz yerdə saxlayın (Apple onları bir daha yükləməyə vermir^).
pause
exit /b 0
:err
echo [XETA] Alınmadı - yuxarıdakı mətni göndərin.
pause
exit /b 1
