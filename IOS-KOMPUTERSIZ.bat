@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Simo - iPhone (kompütersiz) build
rem iPhone üçün MÜSTƏQİL tətbiq (preview): kompüter və BASLAT.bat lazım deyil, birbaşa serverə qoşulur.
rem Kod dəyişikliyi telefona yalnız yeni build ilə gəlir (development build-dən fərqi budur).
call "%~dp0scripts\windows\node.bat" || ( pause & exit /b 1 )
call "%~dp0scripts\windows\install.bat" || ( pause & exit /b 1 )
cd mobile

echo [1/4] Expo hesabına giriş
call npx -y eas-cli@latest whoami >nul 2>nul || call npx -y eas-cli@latest login
if errorlevel 1 ( echo [XETA] Giriş alınmadı & pause & exit /b 1 )

echo.
echo [2/4] Layihə Expo-ya bağlanır (soruşsa "Y")
call npx -y eas-cli@latest init
if errorlevel 1 ( echo [XETA] eas init alınmadı & pause & exit /b 1 )

echo.
echo [3/4] iPhone-u qeydiyyatdan keçirmək (bir dəfə)
echo   Apple ID ilə daxil olun, "Website" seçin, çıxan QR-ı iPhone kamerası ilə açın
echo   və profili quraşdırın (Parametrlər - Profil yükləndi - Quraşdır^).
choice /m "iPhone artıq qeydiyyatdadır? (Y=bəli, keç / N=indi qeydiyyat)"
if errorlevel 2 call npx -y eas-cli@latest device:create

echo.
echo [4/4] Build (Expo serverlərində ~15-25 dəqiqə^)
echo   Suallar: Apple ID ilə giriş - Bəli; mövcud sertifikat - Bəli (yenisini yaratmayın^);
echo   qeydiyyatlı cihazları seçin - hamısını işarələyin; Push key - Bəli.
call npx -y eas-cli@latest build -p ios --profile preview
echo.
echo Hazır olanda verilən linki/QR-ı iPhone-da açıb tətbiqi quraşdırın.
echo Tətbiq kompüter söndürülü olanda da işləyir (server: VPS^).
pause
