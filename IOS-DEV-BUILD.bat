@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Simo - iPhone development build
rem iPhone üçün test tətbiqi (development build): zəng, canlı yayın, push işləyir;
rem kod dəyişiklikləri yenidən build etmədən BASLAT.bat ilə dərhal telefonda görünür.
call "%~dp0scripts\windows\node.bat" || ( pause & exit /b 1 )
call "%~dp0scripts\windows\install.bat" || ( pause & exit /b 1 )
cd mobile
if not exist "node_modules\expo-dev-client" ( call npm install --no-fund --no-audit || ( pause & exit /b 1 ) )

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
call npx -y eas-cli@latest build -p ios --profile development
echo.
echo Hazır olanda verilən linki/QR-ı iPhone-da açıb tətbiqi quraşdırın.
echo iPhone-da: Parametrlər - Məxfilik və Təhlükəsizlik - Developer Mode - Aç (telefon yenidən başlayacaq^).
echo Sonra kompüterdə BASLAT.bat - açılan QR-ı iPhone kamerası ilə skan edin.
pause
