@echo off
chcp 65001 >nul
title Simo - Backend (bu pəncərəni bağlamayın)
call "%~dp0node.bat" || ( pause & exit /b 1 )
cd /d "%~dp0..\..\backend"
node scripts\local.mjs %*
echo.
echo Backend dayandı.
pause
