@echo off
chcp 65001 >nul
rem Bazadakı bütün məlumatları silir və demo profillərlə yenidən yaradır, sonra backend-i başladır.
cd /d "%~dp0"
echo DİQQƏT: bütün hesablar, mesajlar və balanslar silinəcək.
echo Əvvəlcə açıq "Simo Backend" pəncərəsini bağlayın.
set /p ok=Davam edək? (h/y): 
if /i not "%ok%"=="h" exit /b 0
call "%~dp0scripts\windows\node.bat" || ( pause & exit /b 1 )
call "%~dp0scripts\windows\install.bat" || ( pause & exit /b 1 )
call "%~dp0scripts\windows\backend.bat" --reset
